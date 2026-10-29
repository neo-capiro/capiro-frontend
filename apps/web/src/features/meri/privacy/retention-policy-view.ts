import type {
  MemoryCleanupRestrictionRead,
  MemoryRetentionPolicyRead,
} from "@/shared/capiro/operations/memory-retention-policy";
import type { PrivacyDeletionView } from "../screens/settings/PrivacyDeletionScreen";

export function cleanupRestrictionNotice(
  read?: MemoryCleanupRestrictionRead,
): string {
  if (!read || read.restriction === "unavailable")
    return "The current submission-record cleanup restriction is unavailable. Cleanup eligibility cannot be confirmed from this check.";
  return read.restriction === "legacy_receipt_disposition_required"
    ? "Legacy submission records need a retention decision before memory cleanup can complete. Reaching the retention date does not remove this restriction."
    : "No legacy submission-record restriction was found at the time of this check. This does not mean that a deletion has completed.";
}

export function memoryPrivacyView(
  read?: MemoryRetentionPolicyRead,
): PrivacyDeletionView {
  const policy = read?.policy;
  const unavailable =
    "Current installed policy unavailable. Refresh to try again.";
  return {
    heading: {
      title: "Privacy and retention",
      description:
        "Current memory retention rules and supported request availability.",
    },
    stores: {
      title: "Memory retention policy",
      description: read
        ? `Policy version ${policy!.version}. Read at ${read.observedAt}. Periods specify when content becomes eligible for cleanup; they are not deletion receipts.`
        : unavailable,
      rows: [
        {
          id: "personal",
          content: "Personal memory",
          retention: policy
            ? `Hidden immediately after offboarding; eligible for cleanup after ${policy.personalAfterOffboardingHours / 24} days.`
            : unavailable,
        },
        {
          id: "client",
          content: "Client memory",
          retention: policy
            ? `Hidden when the client closes; eligible for cleanup after ${policy.clientAfterClosureHours / 24} days. Removing one person's access does not delete shared client memory.`
            : unavailable,
        },
        {
          id: "firm",
          content: "Approved firm memory",
          retention: policy
            ? "Survives the author's departure. Retention remains with the firm."
            : unavailable,
        },
        {
          id: "draft",
          content: "Unsubmitted Settings memory drafts",
          retention: policy
            ? `Expire ${policy.draftAfterCreationHours / 24} days after creation. Saving again does not extend this period.`
            : unavailable,
        },
        {
          id: "other",
          content: "Conversations, uploads, Office drafts and filed records",
          retention:
            "Separate owners and policies. Their retention periods are not reported by this memory policy.",
        },
      ],
    },
    retained: {
      title: "Restrictions and requests",
      description:
        "This page reports policy. It does not establish whether any particular record has been deleted.",
      notices: [
        {
          title: "Legal holds and related records",
          detail: policy
            ? "Held content and the records needed to preserve its history remain retained. A hold does not grant access to that content."
            : "Individual hold status is not available here.",
          tone: "warning",
        },
        {
          title: "Cleanup coverage",
          detail: policy
            ? "The memory policy covers proposals, approved memory, saved memory and their search embeddings. Background cleanup may take longer when records are held or required by retained history. Content-free identities and action receipts may remain."
            : "Cleanup coverage cannot be confirmed until the installed policy is read.",
        },
        {
          title: "Privacy requests unavailable",
          detail:
            "Export and deletion requests are not connected here. No request is submitted by opening or refreshing this page. Filed records and action receipts require support from their own owners.",
        },
      ],
      states: { label: "Individual retention status unavailable" },
    },
  };
}
