import type { StateBoardView } from "../../screens/states/StateBoardScreen";

/** Figma 3.4 copy; the canonical source for the matching live states. */
export const approvalPermissionStates: StateBoardView = {
  title: "Approval states",
  description:
    "Implementation state board · Decision and execution are distinct",
  states: [
    {
      title: "Pending review",
      tone: "warning",
      explanation: "Exact proposal and expiry are visible. No action has run.",
      action: "Review proposal",
    },
    {
      title: "Approved",
      tone: "success",
      explanation:
        "The decision is recorded. Permissions are rechecked before execution.",
      action: "View decision",
    },
    {
      title: "Executing",
      tone: "neutral",
      explanation: "The approved action is being applied once.",
      action: "View action",
    },
    {
      title: "Succeeded",
      tone: "success",
      explanation: "The action completed and its receipt is available.",
      action: "Open receipt",
    },
    {
      title: "Rejected",
      tone: "danger",
      explanation:
        "No action is executed. The reason is retained with the proposal.",
      action: "View decision",
    },
    {
      title: "Changes requested",
      tone: "warning",
      explanation: "The old proposal closes; a new proposal must be reviewed.",
      action: "Prepare new proposal",
    },
    {
      title: "Expired",
      tone: "danger",
      explanation: "This approval is no longer valid. No action will execute.",
      action: "Create fresh proposal",
    },
    {
      title: "Permission revoked",
      tone: "danger",
      explanation:
        "Approval does not override a revoked source or action grant.",
      action: "Review access",
    },
    {
      title: "Already completed",
      tone: "success",
      explanation:
        "Retry returns the prior receipt without repeating the action.",
      action: "View existing receipt",
    },
    {
      title: "Action denied",
      tone: "danger",
      explanation:
        "Your role permits reading this source but not this mutation.",
      action: "View permissions",
    },
    {
      title: "Destination unavailable",
      tone: "danger",
      explanation: "The destination or folder is no longer available.",
      action: "Choose valid destination",
    },
    {
      title: "Read-only role",
      tone: "warning",
      explanation:
        "You can inspect evidence and proposals. Review controls are disabled.",
      action: "View capabilities",
    },
  ],
};
