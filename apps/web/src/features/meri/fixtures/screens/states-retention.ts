import type { StateBoardView } from "../../screens/states/StateBoardScreen";

/** Figma 3.4 11.06 copy: retention preserves only currently permitted content and receipts. */
export const retentionStates: StateBoardView = {
  title: "Retention, deletion and recovery",
  description:
    "Implementation state board · Access and receipts remain governed by workspace policy",
  states: [
    {
      title: "Removed by retention",
      tone: "warning",
      status: "Unavailable",
      explanation:
        "Old conversation messages and files are unavailable. Permitted lineage and action receipts remain.",
      action: "View retained receipts",
    },
    {
      title: "Artifact version deleted",
      tone: "neutral",
      status: "Deleted",
      explanation:
        "Download is unavailable. The version lineage and permitted decision receipt remain.",
      action: "View versions",
    },
    {
      title: "Deletion in progress",
      tone: "warning",
      status: "In progress",
      explanation:
        "The deletion request is recorded. Do not reuse affected messages or files while policy checks finish.",
      action: "View privacy policy",
    },
    {
      title: "Deletion blocked by legal hold",
      tone: "warning",
      status: "Restricted",
      explanation:
        "Workspace policy requires these records to be retained. No deletion was performed.",
      action: "View retention policy",
    },
    {
      title: "Backup restored, access unchanged",
      tone: "warning",
      status: "Restricted",
      explanation:
        "A restored backup cannot revive deleted content or revoked access. Permissions are checked again.",
      action: "Start clean",
    },
    {
      title: "Export ready",
      tone: "success",
      status: "Ready",
      explanation:
        "Only permitted messages are included. Restricted sources and retained records remain excluded.",
      action: "Review export",
    },
    {
      title: "Retention policy changed",
      tone: "neutral",
      status: "Updated",
      explanation:
        "The workspace policy changed. Previously retained content may now be unavailable.",
      action: "View policy",
    },
    {
      title: "Upload expired",
      tone: "warning",
      status: "Expired",
      explanation:
        "The temporary upload is no longer available. Attach a permitted copy again if needed.",
      action: "Attach a file",
    },
    {
      title: "Browser session data cleared",
      tone: "neutral",
      status: "Cleared",
      explanation:
        "Saved browser session data was cleared. This does not restore a disconnected account.",
      action: "View connections",
    },
  ],
};
