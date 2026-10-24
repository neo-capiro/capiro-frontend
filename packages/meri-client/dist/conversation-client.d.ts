import type { ConversationSubmitRequest, ConversationHistoryRequest, ConversationCancelledResponse } from "@capiro/meri-contracts/conversation-application";
import { ConversationUnavailable } from "./conversation-network.js";
import type { ConversationLifetime } from "./conversation-network.js";
import type { ConversationObservationSnapshot } from "./conversation-observation.js";
import type { ConversationChat } from "./conversation-chat.js";
export { ConversationUnavailable };
export type { ConversationLifetime, ConversationObservationSnapshot, ConversationChat, };
export interface MeriConversationSnapshot {
    readonly status: "idle" | "loading" | "ready" | "unavailable" | "disposed";
    readonly observation: ConversationObservationSnapshot | null;
    readonly submit: "idle" | "pending" | "unknown" | "observed";
    readonly cancel: "idle" | "pending" | "unknown" | "observed";
    readonly cancelReceipt: ConversationCancelledResponse | null;
}
/** Public handle deliberately exposes no credential, branded view or cursor injection. */
export declare function createMeriConversation(options: ConversationLifetime): Readonly<{
    getSnapshot: () => MeriConversationSnapshot;
    subscribe: (listener: () => void) => () => void;
    submit: (input: ConversationSubmitRequest) => Promise<MeriConversationSnapshot>;
    submitInitial: (input: ConversationSubmitRequest) => Promise<MeriConversationSnapshot>;
    retrySubmit: () => Promise<MeriConversationSnapshot>;
    history: (input?: ConversationHistoryRequest) => Promise<MeriConversationSnapshot>;
    cancel: () => Promise<Readonly<ConversationCancelledResponse>>;
    openChat: () => ConversationChat;
    dispose: () => void;
}>;
