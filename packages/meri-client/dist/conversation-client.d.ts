import type { ConversationSubmitRequest, ConversationHistoryRequest, ConversationCancelledResponse, ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import { ConversationUnavailable } from "./conversation-network.js";
import type { ConversationLifetime } from "./conversation-network.js";
import type { ConversationObservationSnapshot } from "./conversation-observation.js";
import type { ConversationChat } from "./conversation-chat.js";
import type { ConversationLifecycleControlRequest, ConversationCheckpointInspectionRequest } from "@capiro/meri-contracts/conversation-lifecycle";
export { ConversationUnavailable };
export type { ConversationLifetime, ConversationObservationSnapshot, ConversationChat, };
export interface MeriConversationSnapshot {
    readonly status: "idle" | "loading" | "ready" | "unavailable" | "disposed";
    readonly observation: ConversationObservationSnapshot | null;
    readonly submit: "idle" | "pending" | "unknown" | "observed";
    readonly cancel: "idle" | "pending" | "unknown" | "observed";
    readonly cancelReceipt: ConversationCancelledResponse | null;
    readonly acceptedRequest: Readonly<ConversationStoredRequest> | null;
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
    control: (input: ConversationLifecycleControlRequest) => Promise<import("@capiro/meri-contracts/conversation-lifecycle").ConversationLifecycleResponse<"control">>;
    inspectCheckpoint: (input: ConversationCheckpointInspectionRequest) => Promise<import("@capiro/meri-contracts/conversation-lifecycle").ConversationLifecycleResponse<"inspect">>;
    openChat: () => ConversationChat;
    dispose: () => void;
}>;
/** Clarifying questions: pending projection from the run's durable events, answer mapping and the answer control. */
export { pendingQuestion, questionOutcome, questionAnswers, answerControl, } from "./conversation-questions.js";
export type { ConversationQuestion, ConversationQuestionOption, PendingQuestion, QuestionAnswerValue, QuestionOutcome, QuestionSelection, } from "./conversation-questions.js";
