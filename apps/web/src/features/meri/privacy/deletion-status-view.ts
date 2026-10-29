import type { ConversationHistoryDeletionStatusResponse } from "@capiro/meri-contracts/conversation-history";

type Status = ConversationHistoryDeletionStatusResponse;
const reasons: Record<Status["reasons"][number], string> = {
  restore_period: "The 30-day Trash restore period has not ended.",
  legal_hold: "The last cleanup check reported a legal hold.",
  object_lock: "The last cleanup check reported a storage retention lock.",
  shared_reference: "The last cleanup check found a copy still used elsewhere.",
  policy: "The installed retention policy is preventing cleanup.",
  cleanup_pending: "The request is recorded and cleanup has not completed.",
  verification_unavailable:
    "Cleanup could not be verified. This is not a deletion confirmation.",
  cleanup_disabled: "Automatic cleanup is not currently enabled.",
};
const labels: Record<Status["state"], string> = {
  pending: "Pending cleanup",
  blocked: "Cleanup blocked",
  unknown: "Deletion not verified",
  completed: "Cleanup verified complete",
  superseded: "Request superseded",
};
export function deletionStatusView(status: Status) {
  return {
    label: labels[status.state],
    detail:
      status.state === "completed"
        ? "The service verified this request's cleanup targets were absent at the time shown."
        : status.state === "superseded"
          ? "A later conversation change superseded this request. It does not confirm deletion."
          : status.reasons.map((reason) => reasons[reason]).join(" "),
    checkedAt: new Date(status.checkedAtMs).toISOString(),
    retained: status.retainedSharedCopies
      ? "Copies referenced elsewhere remain retained under their own policy."
      : undefined,
  };
}
