import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessageChunk } from 'ai';
import { validateUIEvent } from '@capiro/meri-contracts/browser';
import { receiveNativeBillTextSourceEvent, BILL_TEXT_SOURCE_EVENT, receiveNativeHearingSourceEvent, HEARING_SOURCE_EVENT } from '@capiro/meri-contracts/conversation-sources';
import {
  conversationApplicationMetadata as protocol, receiveConversationRequest, receiveConversationResponse,
  ConversationResponseError,
} from '@capiro/meri-contracts/conversation-application';
import type { MeriUIMessage } from '@capiro/meri-ui-stream/protocol';
import type { ConversationEvent } from '@capiro/meri-contracts/conversation-application';
import { MeriGuardedTransport } from './guarded-transport.js';
import { ConversationUnavailable } from './conversation-network.js';
import type { ConversationNetwork } from './conversation-network.js';
import type { ConversationObservation } from './conversation-observation.js';

export interface ConversationChat {
  readonly chat: Chat<MeriUIMessage>;
  readonly transport: MeriGuardedTransport<ConversationEvent>;
}

/** Only the pinned producer's content-free lifecycle frames may bypass event admission. */
function checkConversationFrame(chunk: UIMessageChunk) {
  if (chunk.type === 'data-meri-event') {
    if (chunk.transient !== true) throw new ConversationUnavailable('nontransient-event');
    return;
  }
  if (chunk.type === 'error') throw new ConversationUnavailable('subscription-unavailable');
  const keys = Object.keys(chunk);
  if (chunk.type === 'finish' && keys.length === 1) return;
  if (chunk.type === 'start' && keys.every(key => key === 'type' || key === 'messageId')
    && typeof chunk.messageId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chunk.messageId)) return;
  throw new ConversationUnavailable('unsupported-subscription-frame');
}

/** The existing guard and external SDK Chat, with a separate public0.1.3 admission mode. */
export function conversationChat(
  network: ConversationNetwork, observation: ConversationObservation, current: () => boolean,
): ConversationChat {
  const path = protocol.routes.events.path;
  const command = receiveConversationRequest('events', new TextEncoder().encode(JSON.stringify({
    command: { conversationId: observation.view.run.binding.conversationId, intent: 'view.subscribe' },
  })));
  let closed = false, generation = 0;
  const check = () => {
    network.check();
    if (closed || !current()) throw new ConversationUnavailable('superseded-observation');
  };
  const inner = new DefaultChatTransport<MeriUIMessage>({
    api: network.origin + path,
    prepareSendMessagesRequest: () => { check(); return { body: command }; },
    prepareReconnectToStreamRequest: () => { check(); return { headers: observation.reconnect().headers }; },
    fetch: async (url, init) => {
      check();
      const reconnect = observation.reconnect();
      const get = init?.method === 'GET';
      const expected = get ? reconnect.path : path;
      if (String(url) !== network.origin + expected || (!get && init?.method !== 'POST')) {
        throw new ConversationUnavailable('unexpected-subscription-route');
      }
      const response = await network.observe(expected, get
        ? { method: 'GET', headers: reconnect.headers, ...(init?.signal ? { signal: init.signal } : {}) }
        : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(command), ...(init?.signal ? { signal: init.signal } : {}) });
      if (response.status !== 200 && response.status !== 204) {
        const value = await receiveConversationResponse('events', response.status,
          new Uint8Array(await response.arrayBuffer()), command, observation.view);
        check();
        throw new ConversationUnavailable('error' in value ? value.error.code : 'subscription-unavailable');
      }
      try { check(); return response; }
      catch (error) { await response.body?.cancel().catch(() => {}); throw error; }
    },
  });
  const transport = new MeriGuardedTransport({
    inner: {
      sendMessages: options => inner.sendMessages(options),
      reconnectToStream: options => inner.reconnectToStream(options),
      close: () => {
        closed = true; generation++; network.stopObservation();
        chat.messages = []; chat.clearError();
      },
    },
    beginGuard: () => {
      check(); network.stopObservation(); const captured = ++generation;
      return chunk => {
        check();
        if (captured !== generation) throw new ConversationUnavailable('superseded-stream');
        checkConversationFrame(chunk);
      };
    },
    validateEvent: value => {
      if (value !== null && typeof value === 'object' && 'type' in value && value.type === BILL_TEXT_SOURCE_EVENT)
        return receiveNativeBillTextSourceEvent(new TextEncoder().encode(JSON.stringify(value)));
      if (value !== null && typeof value === 'object' && 'type' in value && value.type === HEARING_SOURCE_EVENT)
        return receiveNativeHearingSourceEvent(new TextEncoder().encode(JSON.stringify(value)));
      if (!validateUIEvent(value)) throw new ConversationUnavailable('invalid-event');
      return value;
    },
    onEvent: event => { check(); observation.accept(event); },
    errorBoundary: error => new ConversationUnavailable(
      error instanceof ConversationResponseError || error instanceof ConversationUnavailable
        ? error.code : 'subscription-unavailable',
    ),
  });
  const chat = new Chat<MeriUIMessage>({
    id: observation.view.run.binding.conversationId, transport,
    sendAutomaticallyWhen: () => false, onError: () => {},
  });
  return Object.freeze({ chat, transport });
}
