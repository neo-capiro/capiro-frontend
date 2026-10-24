import type { HelpShortcutsView } from "./HelpShortcutsScreen";
import type { NotificationsAccountView } from "./NotificationsAccountScreen";
import type { PrivacyDeletionView } from "./PrivacyDeletionScreen";

/** Canonical 09.05–09.07 copy with no account data (see preferences-unavailable.ts). */
export const updates: NotificationsAccountView = {
  heading: {
    title: "Workspace updates",
    description:
      "Run outcomes, decisions, connection changes and your account.",
  },
  updates: {
    title: "Workspace updates",
    description: "Run outcomes, decisions and connection changes.",
    fields: [
      { id: "runs", label: "Run outcomes", value: "Completion and failures" },
      {
        id: "decisions",
        label: "Decisions",
        value: "Approval and rejection updates",
      },
      {
        id: "connections",
        label: "Connection changes",
        value: "Expired, revoked and reconnect notices",
      },
    ],
    notice: {
      title: "Workspace updates unavailable",
      detail:
        "Notification preferences cannot be saved until Meri is connected.",
    },
  },
  account: {
    title: "Account updates",
    description:
      "Client and tenant permissions are checked across every Meri view.",
    fields: [
      {
        id: "account",
        label: "Account",
        value: "",
        placeholder: "Unavailable",
      },
      {
        id: "workspace",
        label: "Current workspace",
        value: "",
        placeholder: "Unavailable",
      },
    ],
  },
  empty: {
    title: "Empty updates",
    detail:
      "You are all caught up. New run, decision and connection updates appear here when available.",
  },
};

const policyUnavailable = "Workspace policy · unavailable";

export const privacy: PrivacyDeletionView = {
  heading: {
    title: "Privacy and retention",
    description:
      "Your content follows workspace access and retention policies.",
  },
  stores: {
    title: "What Meri stores",
    description: "Retention periods are workspace policy, shown read-only.",
    rows: [
      ["conversations", "Conversations and UI events", policyUnavailable],
      ["uploads", "Uploads and browser state", policyUnavailable],
      ["previews", "Previews and artifact versions", policyUnavailable],
      [
        "records",
        "Filed records and action receipts",
        "Separate policy / legal hold",
      ],
    ].map(([id = "", content = "", retention = ""]) => ({
      id,
      content,
      retention,
    })),
  },
  retained: {
    title: "Some records may be retained",
    description:
      "The conversation and its Meri workspace files are removed from your view only if policy permits. Filed client records and recorded action receipts follow their own retention rules.",
    notices: [
      {
        title: "Legal hold",
        detail:
          "Deletion is blocked while a legal hold applies. Retained records cannot be removed here.",
        tone: "warning",
      },
      {
        title: "Deletion in progress",
        detail:
          "The request is being checked. Do not offer a second destructive action while the outcome is pending.",
      },
    ],
    states: { label: "View retention states" },
  },
};

export const help: HelpShortcutsView = {
  heading: {
    title: "Help and shortcuts",
    description: "Supported work, keyboard navigation and reporting a problem.",
  },
  shortcuts: {
    title: "Available keyboard controls",
    rows: [
      ["send", "Send message when sending is available", "Enter"],
      ["line", "New line", "Shift+Enter"],
      ["close", "Close a dismissible dialog", "Esc"],
      ["move", "Move between controls", "Tab / Shift+Tab"],
    ].map(([id = "", action = "", keys = ""]) => ({ id, action, keys })),
    footnote:
      "Message controls apply in the Meri composer. Workspace search shortcuts are not available in the connected application.",
  },
  supported: {
    title: "Supported work",
    work: "Research · Analysis · Artifact creation and revision · Memory proposals · Task proposals · Filing · Scheduled drafting",
  },
  report: {
    title: "Report a problem",
    summary: {
      id: "summary",
      label: "What happened?",
      value: "",
      placeholder: "Something did not work as expected",
    },
    detail: { id: "detail", label: "Describe the problem", value: "" },
    toggle: "Include run reference",
    runReference: {
      label: "Run reference",
      placeholder: "Optional · select the toggle to include",
    },
    footnote:
      "Attachments are not supported. Conversation content, private files and run metadata are not attached automatically.",
  },
  unavailable: {
    title: "Feedback submission unavailable",
    detail:
      "No report has been sent. Feedback submission is unavailable until a support service is connected.",
  },
};
