import type { StateBoardView } from "../../screens/states/StateBoardScreen";

/** Figma 3.4 copy; the canonical source for the matching live states. */
export const runRecoveryStates: StateBoardView = {
  title: "Run states",
  description: "Implementation state board · Each card is an alternate state",
  states: [
    {
      title: "Queued",
      tone: "neutral",
      explanation: "Waiting for an available run slot. No task has started.",
      action: "View queue",
    },
    {
      title: "Starting",
      tone: "neutral",
      explanation: "Checking current scope, tools and workspace readiness.",
      action: "View run",
    },
    {
      title: "Running",
      tone: "neutral",
      explanation:
        "Meri is working. Concise activity and outputs are available.",
      action: "View activity",
    },
    {
      title: "Waiting for approval",
      tone: "warning",
      explanation: "The proposed action cannot proceed until reviewed.",
      action: "Review proposal",
    },
    {
      title: "Paused",
      tone: "warning",
      explanation: "Work is paused with a verified checkpoint.",
      action: "Resume from checkpoint",
    },
    {
      title: "Cancelling",
      tone: "warning",
      explanation: "Meri is finishing the current safe step before stopping.",
      action: "View completed work",
    },
    {
      title: "Cancelled",
      tone: "success",
      explanation: "Remaining work stopped. Completed effects remain recorded.",
      action: "Open receipts",
    },
    {
      title: "Budget reached",
      tone: "warning",
      explanation:
        "No further work starts. All attempts count toward the limit.",
      action: "View usage",
    },
    {
      title: "Deadline reached",
      tone: "warning",
      explanation:
        "Time limit reached. Verified partial outputs are preserved.",
      action: "View outputs",
    },
    {
      title: "Provider unavailable",
      tone: "warning",
      explanation: "A temporary provider error interrupted the run.",
      action: "Retry from checkpoint",
    },
    {
      title: "Workspace not persisted",
      tone: "danger",
      explanation:
        "Session or files were not durably saved. Resume is unavailable.",
      action: "Open available output",
    },
    {
      title: "Restore failed",
      tone: "danger",
      explanation:
        "Saved session or files could not be verified. Start clean or inspect partial work.",
      action: "Start clean",
    },
  ],
};
