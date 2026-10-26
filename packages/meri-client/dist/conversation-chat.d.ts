import { Chat } from '@ai-sdk/react';
import type { MeriUIMessage } from '@capiro/meri-ui-stream/protocol';
import type { ConversationEvent } from '@capiro/meri-contracts/conversation-application';
import { MeriGuardedTransport } from './guarded-transport.js';
import type { ConversationNetwork } from './conversation-network.js';
import type { ConversationObservation } from './conversation-observation.js';
export interface ConversationChat {
    readonly chat: Chat<MeriUIMessage>;
    readonly transport: MeriGuardedTransport<ConversationEvent>;
}
/** The existing guard and external SDK Chat, with a separate public0.1.3 admission mode. */
export declare function conversationChat(network: ConversationNetwork, observation: ConversationObservation, current: () => boolean): ConversationChat;
