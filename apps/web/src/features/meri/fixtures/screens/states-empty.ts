import type { StateBoardView } from "../../screens/states/StateBoardScreen";

/** Figma 3.4 copy; the canonical source for the matching live states. */
export const emptySuccessStates: StateBoardView = {
  title: "Empty and success states",
  description:
    "Implementation state board · Empty results stay bounded to the checked scope",
  states: [
    {
      title: "No conversations",
      tone: "neutral",
      explanation:
        "Start a conversation with an authorized client or general scope.",
      action: "New conversation",
    },
    {
      title: "No workspace files",
      tone: "neutral",
      explanation: "Upload a source or ask Meri to create an artifact.",
      action: "Upload files",
    },
    {
      title: "No pending approvals",
      tone: "success",
      explanation: "No decisions are currently assigned to you.",
      action: "View history",
    },
    {
      title: "No routines",
      tone: "neutral",
      explanation:
        "Create a routine for permitted recurring research or drafting.",
      action: "New routine",
    },
    {
      title: "No memory matches",
      tone: "neutral",
      explanation: "No matching facts were returned for this scope and query.",
      action: "Change query",
    },
    {
      title: "No search results",
      tone: "neutral",
      explanation: "Try another term or broaden a permitted filter.",
      action: "Search again",
    },
    {
      title: "No source matches",
      tone: "warning",
      explanation:
        "No results in the checked date range and qualified history.",
      action: "View coverage",
    },
    {
      title: "No authorized client",
      tone: "warning",
      explanation:
        "Use permitted general sources or review your current access.",
      action: "Choose scope",
    },
    {
      title: "Saving",
      tone: "neutral",
      explanation: "The change is being persisted. It is not marked saved yet.",
      action: "View status",
    },
    {
      title: "Saved",
      tone: "success",
      explanation:
        "The preference or workspace change was persisted successfully.",
      action: "Return to workspace",
    },
    {
      title: "Object deleted",
      tone: "success",
      explanation: "The item is unavailable; retained receipts follow policy.",
      action: "Open history",
    },
    {
      title: "Duplicate prevented",
      tone: "success",
      explanation:
        "The original submission or receipt is used instead of repeating it.",
      action: "View receipt",
    },
  ],
};
