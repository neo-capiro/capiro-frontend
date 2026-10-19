import type { StateBoardView } from "../../screens/states/StateBoardScreen";

/** Figma 3.4 copy; the canonical source for the matching live states. */
export const conversationMemoryStates: StateBoardView = {
  title: "Conversation and memory states",
  description:
    "Implementation state board · Preserve drafts without carrying revoked context",
  states: [
    {
      title: "Streaming answer",
      tone: "neutral",
      explanation: "The response is arriving; Stop remains available.",
      action: "Stop remaining work",
    },
    {
      title: "Scrolled away",
      tone: "neutral",
      explanation:
        "A latest-message control appears while the answer continues.",
      action: "Jump to latest",
    },
    {
      title: "Offline",
      tone: "warning",
      explanation:
        "Your unsent draft is preserved. New requests cannot be submitted.",
      action: "Open draft",
    },
    {
      title: "Reconnecting",
      tone: "neutral",
      explanation: "The stream reconnects without starting a second run.",
      action: "View current run",
    },
    {
      title: "Unsent draft saved",
      tone: "success",
      explanation:
        "Navigation retains the unsent prompt within its permitted scope.",
      action: "Return to draft",
    },
    {
      title: "Conversation access revoked",
      tone: "danger",
      explanation: "Old messages, files and context cannot be reused.",
      action: "Start clean",
    },
    {
      title: "Personal memory",
      tone: "warning",
      explanation: "This fact is visible only to its granted owner.",
      action: "View own memory",
    },
    {
      title: "Superseded memory",
      tone: "warning",
      explanation:
        "A newer reviewed fact replaced this one. History remains labeled.",
      action: "Open current fact",
    },
    {
      title: "Conflicting evidence",
      tone: "warning",
      explanation:
        "Different sourced facts are shown with dates and review status.",
      action: "Review evidence",
    },
    {
      title: "Memory proposal expired",
      tone: "danger",
      explanation:
        "The proposed change was never applied. A fresh proposal is needed.",
      action: "Create new proposal",
    },
    {
      title: "Grant expired",
      tone: "danger",
      explanation:
        "This source grant no longer permits retrieval or old-context reuse.",
      action: "Review access",
    },
    {
      title: "Conversation export",
      tone: "success",
      explanation:
        "Only permitted messages are included in the Markdown export.",
      action: "Review export",
    },
  ],
};
