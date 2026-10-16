import type { StateBoardView } from "../../screens/states/StateBoardScreen";

/** Figma 3.4 11.07 copy: an unavailable service never substitutes sample data. */
export const sessionStates: StateBoardView = {
  title: "Session and service availability",
  description:
    "Implementation state board · Keep drafts safe and never substitute sample data for an unavailable service",
  states: [
    {
      title: "Signed out",
      tone: "neutral",
      status: "Signed out",
      explanation:
        "This workspace is closed. Sign in through the application to access authorized conversations.",
      action: "Sign in",
    },
    {
      title: "Session expired",
      tone: "warning",
      status: "Sign in required",
      explanation:
        "Your unsent draft is kept on this device. Sign in again, then recheck access before sending.",
      action: "Sign in again",
    },
    {
      title: "Meri is not enabled",
      tone: "neutral",
      status: "Unavailable",
      explanation:
        "Meri has not been enabled for this workspace. Existing Capiro areas remain available.",
      action: "Contact workspace admin",
    },
    {
      title: "Conversation service unavailable",
      tone: "danger",
      status: "Unavailable",
      explanation:
        "Conversations cannot be loaded. No sample content has been substituted. Your unsent draft is kept.",
      action: "Check service status",
    },
    {
      title: "Document or action service unavailable",
      tone: "danger",
      status: "Unavailable",
      explanation:
        "Document creation or actions cannot start. Existing verified outputs remain available if permitted.",
      action: "View existing files",
    },
    {
      title: "Partial service",
      tone: "warning",
      status: "Degraded",
      explanation:
        "Some providers are unavailable. Meri shows the affected scope and verified partial results.",
      action: "View run detail",
    },
    {
      title: "No authorized client selected",
      tone: "neutral",
      status: "Choose scope",
      explanation:
        "Choose an authorized client or General scope. Client tools stay unavailable until scope is confirmed.",
      action: "Choose scope",
    },
    {
      title: "Client access removed",
      tone: "danger",
      status: "Access changed",
      explanation:
        "Stop reusing client content. Start a clean conversation with a currently permitted scope.",
      action: "Start clean",
    },
    {
      title: "Maintenance or read-only mode",
      tone: "warning",
      status: "Read only",
      explanation:
        "You can inspect permitted records. New messages, revisions and actions are temporarily unavailable.",
      action: "View conversations",
    },
  ],
};
