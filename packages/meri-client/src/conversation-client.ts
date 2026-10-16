import {
  conversationApplicationMetadata as protocol, receiveConversationRequest, receiveConversationResponse,
} from '@capiro/meri-contracts/conversation-application';
import type {
  AdmittedConversationRequest, AdmittedConversationView, ConversationRoute,
  ConversationSubmitRequest, ConversationHistoryRequest, ConversationCancelledResponse,
} from '@capiro/meri-contracts/conversation-application';
import { ConversationNetwork, ConversationUnavailable } from './conversation-network.js';
import type { ConversationLifetime } from './conversation-network.js';
import { ConversationObservation } from './conversation-observation.js';
import type { ConversationObservationSnapshot } from './conversation-observation.js';
import { conversationChat } from './conversation-chat.js';
import type { ConversationChat } from './conversation-chat.js';
import { stableStringify } from './json-identity.js';

export { ConversationUnavailable };
export type { ConversationLifetime, ConversationObservationSnapshot, ConversationChat };
export interface MeriConversationSnapshot {
  readonly status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'disposed';
  readonly observation: ConversationObservationSnapshot | null;
  readonly submit: 'idle' | 'pending' | 'unknown' | 'observed';
  readonly cancel: 'idle' | 'pending' | 'unknown' | 'observed';
  readonly cancelReceipt: ConversationCancelledResponse | null;
}
const EMPTY: MeriConversationSnapshot = Object.freeze({
  status: 'idle', observation: null, submit: 'idle', cancel: 'idle', cancelReceipt: null,
});
const DISPOSED: MeriConversationSnapshot = Object.freeze({ ...EMPTY, status: 'disposed' });
const HIDDEN: MeriConversationSnapshot = Object.freeze({ ...EMPTY, status: 'unavailable' });
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

/** One server-selected run/context. No new turn or durable cancel is implied by observation. */
class ConversationConnection {
  private readonly network: ConversationNetwork;
  private readonly context: ConversationLifetime['context'];
  private state = EMPTY;
  private view: AdmittedConversationView | undefined;
  private observation: ConversationObservation | undefined;
  private handle: ConversationChat | undefined;
  private intent: AdmittedConversationRequest<'submit'> | undefined;
  private busy = false;
  private disposed = false;
  private readonly listeners = new Set<() => void>();
  constructor(options: ConversationLifetime) {
    this.context = Object.freeze({ ...options.context });
    this.network = new ConversationNetwork(options, () => this.clear());
  }
  getSnapshot = (): MeriConversationSnapshot => {
    if (this.disposed) return DISPOSED;
    try { this.network.check(); return this.state; } catch { return this.disposed ? DISPOSED : HIDDEN; }
  };
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<MeriConversationSnapshot>) {
    if (this.disposed) return;
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener();
  }
  private detach() {
    const handle = this.handle;
    handle?.transport.close();
    if (handle) void handle.chat.dispose().catch(() => {}).finally(() => {
      handle.chat.messages = []; handle.chat.clearError();
    });
    this.handle = undefined;
  }
  private clear() {
    if (this.disposed) return;
    this.disposed = true; this.detach();
    this.view = undefined; this.observation = undefined; this.intent = undefined;
    this.state = DISPOSED;
    for (const listener of this.listeners) listener();
  }
  dispose = () => this.network.dispose();
  private start() {
    this.network.check();
    if (this.disposed || this.busy) throw new ConversationUnavailable('operation-unavailable');
    this.busy = true;
  }
  private bind(view: AdmittedConversationView) {
    const binding = view.run.binding;
    for (const key of ['tenantId', 'actorId', 'conversationId', 'runId'] as const) {
      if (binding[key] !== this.context[key]) throw new ConversationUnavailable('foreign-session-view');
    }
    if (!view.run.scopes.some(scope => scope.tenantId === this.context.tenantId && scope.kind === 'client'
      && scope.resourceId === this.context.selectedClientId)) throw new ConversationUnavailable('foreign-client-view');
    if ('request' in view && this.intent) {
      const saved = view.request;
      const input = this.intent;
      if (saved.requestId !== input.requestId || saved.prompt !== input.prompt
        || stableStringify(saved.windowRequest) !== stableStringify(input.windowRequest ?? null)
        || stableStringify(saved.skill && { skillId: saved.skill.skillId, skillVersion: saved.skill.skillVersion }) !== stableStringify(input.skill ?? null)) {
        throw new ConversationUnavailable('foreign-retained-request');
      }
    }
    this.detach(); this.network.check();
    this.view = view;
    const observation = new ConversationObservation(view, () => {
      this.network.check();
      if (this.observation === observation) this.publish({ observation: observation.snapshot });
    }, 'request' in view ? null : this.intent?.prompt ?? null);
    this.observation = observation;
    this.publish({ status: 'ready', observation: observation.snapshot });
  }
  private async receive<R extends Exclude<ConversationRoute, 'events'>>(
    route: R, request: AdmittedConversationRequest<R>, onDispatch?: () => void,
  ) {
    const current = this.view;
    const response = await this.network.json(protocol.routes[route].path, bytes(request), onDispatch);
    const value = await receiveConversationResponse(route, response.status, response.bytes, request, current);
    this.network.check();
    if (this.disposed || this.view !== current) throw new ConversationUnavailable('superseded-response');
    if ('error' in value) throw new ConversationUnavailable(value.error.code);
    return value;
  }
  submit = async (input: ConversationSubmitRequest) => {
    this.network.check();
    if (this.intent) throw new ConversationUnavailable('retained-submit-intent');
    const request = receiveConversationRequest('submit', bytes(input));
    this.start(); this.intent = request;
    return this.sendRetained();
  };
  retrySubmit = async () => {
    if (!this.intent || this.state.submit !== 'unknown') throw new ConversationUnavailable('no-unknown-submit');
    this.start(); return this.sendRetained(true);
  };
  private async sendRetained(previouslyUnknown = false) {
    const intent = this.intent!;
    let dispatched = false;
    this.publish({ submit: 'pending' });
    try {
      const view = await this.receive('submit', intent, () => { dispatched = true; });
      this.bind(view); this.publish({ submit: 'observed' });
      return this.getSnapshot();
    } catch (error) {
      if (!dispatched && !previouslyUnknown) this.intent = undefined;
      this.publish({ submit: dispatched || previouslyUnknown ? 'unknown' : 'idle' });
      throw error;
    } finally { this.busy = false; }
  }
  history = async (input: ConversationHistoryRequest = {}) => {
    const request = receiveConversationRequest('history', bytes(input));
    this.start(); this.detach(); this.publish({ status: 'loading', observation: null });
    try {
      const view = await this.receive('history', request);
      this.bind(view);
      return this.getSnapshot();
    } catch (error) { this.publish({ status: 'unavailable', observation: null }); throw error; }
    finally { this.busy = false; }
  };
  cancel = async () => {
    if (!this.view) throw new ConversationUnavailable('no-admitted-run');
    const request = receiveConversationRequest('cancel', bytes({}));
    this.start(); let dispatched = false;
    const previouslyUnknown = this.state.cancel === 'unknown';
    this.publish({ cancel: 'pending', cancelReceipt: null });
    try {
      const receipt = await this.receive('cancel', request, () => { dispatched = true; });
      this.publish({ cancel: 'observed', cancelReceipt: receipt }); return receipt;
    } catch (error) { this.publish({ cancel: dispatched || previouslyUnknown ? 'unknown' : 'idle' }); throw error; }
    finally { this.busy = false; }
  };
  openChat = (): ConversationChat => {
    this.network.check();
    const observation = this.observation;
    if (this.busy || this.state.status !== 'ready' || !observation) throw new ConversationUnavailable('no-current-observation');
    if (!this.handle || this.handle.transport.isClosed) {
      this.handle = conversationChat(this.network, observation, () => !this.disposed && this.observation === observation && this.state.status === 'ready');
    }
    return this.handle;
  };
}

/** Public handle deliberately exposes no credential, branded view or cursor injection. */
export function createMeriConversation(options: ConversationLifetime) {
  const connection = new ConversationConnection(options);
  return Object.freeze({
    getSnapshot: connection.getSnapshot, subscribe: connection.subscribe,
    submit: connection.submit, retrySubmit: connection.retrySubmit,
    history: connection.history, cancel: connection.cancel,
    openChat: connection.openChat, dispose: connection.dispose,
  });
}
