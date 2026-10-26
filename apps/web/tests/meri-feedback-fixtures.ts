import type {
  ConversationFeedbackRequest,
  ConversationFeedbackReceipt,
} from "@capiro/meri-contracts/conversation-application";
export const feedbackId = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
export const feedbackContext = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  conversationId: feedbackId(1),
  runId: feedbackId(2),
  selectedClientId: null,
};
export const feedbackRequest: ConversationFeedbackRequest = {
  requestId: feedbackId(3),
  target: {
    kind: "message",
    runId: feedbackId(2),
    messageId: feedbackId(4),
    throughSequence: 7,
  },
  sourceEventId: null,
  signal: {
    kind: "factual_correction",
    proposedCorrection: "The recorded date should be 26 October.",
  },
};
export function feedbackReceipt(
  input = feedbackRequest,
): ConversationFeedbackReceipt {
  return {
    feedbackId: input.requestId,
    requestId: input.requestId,
    conversationId: feedbackContext.conversationId,
    actorId: feedbackContext.actorId,
    recordedAt: "2026-10-26T12:00:00.000Z",
    target: input.target,
    signal: input.signal,
    revision: {
      sha256: "a".repeat(64),
      artifact:
        input.target.kind === "artifact"
          ? {
              status: "bound",
              artifactId: input.target.artifactId,
              versionId: input.target.versionId,
            }
          : { status: "not_applicable", reason: "message_target" },
    },
    sourceRevision: input.sourceEventId
      ? {
          status: "bound",
          eventId: input.sourceEventId,
          eventSha256: "b".repeat(64),
        }
      : { status: "not_applicable", reason: "no_source_selected" },
    taskRevision: {
      status: "not_applicable",
      reason: "no_native_task_revision_on_target",
    },
    execution: {
      status: "recorded",
      basis: "run_sdk_usage",
      usageSha256: "c".repeat(64),
      sessionId: feedbackId(9),
      models: ["synthetic.actual.model"],
      attribution: "run_including_subagents",
    },
    disposition: { status: "recorded", review: "not_reviewed", effect: "none" },
    linkedReceipts: [],
  };
}
export function feedbackStorage() {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}
