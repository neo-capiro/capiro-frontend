import type { HistoryView } from "../../screens/conversation/ConversationHistoryScreen";
import { fixtureHref } from "./href";

const listed = "Find previous work, including runs that are still active.";
const rows: HistoryView["rows"] = [
  ["brief", "Anduril meeting brief", "Anduril", "Complete", "Just now"],
  ["funding", "FY27 funding landscape", "General", "Running", "2 min ago"],
  ["updates", "Weekly client updates", "Anduril", "Complete", "Yesterday"],
  ["sources", "Source comparison", "Anduril", "Archived", "7 Oct"],
].map(([id = "", title = "", client = "", status = "", updated = ""]) => ({
  id,
  title,
  client,
  status,
  updated,
}));

const history: HistoryView = {
  description: listed,
  rows,
  background: {
    conversationId: "funding",
    title: "1 run is continuing in the background",
    detail:
      "Open Runs to check progress. Conversation navigation preserves your draft.",
    runsHref: fixtureHref("background-runs"),
  },
  manageHref: fixtureHref("conversation-management"),
};
const opened = (initial: HistoryView["initial"]): HistoryView => ({
  ...history,
  initial,
});

/** 01.04 and its 15 October states: one history list opened with different local search, filter and selection state. */
export const historyViews = {
  all: history,
  empty: {
    description: "Your authorized workspace",
    rows: [],
  } satisfies HistoryView,
  noMatches: opened({ query: "Procurement conference" }),
  complete: opened({ status: "Complete" }),
  anduril: opened({ client: "Anduril" }),
  general: opened({ client: "General" }),
  running: opened({ status: "Running" }),
  archived: opened({ status: "Archived" }),
  clientMenu: opened({ openMenu: "client" }),
  statusMenu: opened({ openMenu: "status" }),
  afterDeletion: {
    ...history,
    description:
      "Anduril meeting brief was deleted · 3 permitted conversations remain",
    rows: rows.filter((row) => row.id !== "brief"),
    initial: { selectedId: null },
    outcome: {
      title: "Conversation deleted",
      detail:
        "The item is removed from your view. Retained receipts follow policy.",
    },
  } satisfies HistoryView,
};
