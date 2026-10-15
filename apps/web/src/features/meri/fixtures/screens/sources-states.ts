import type { SourcesStateView } from "../../screens/sources/SourcesStateScreen";
import { fixtureHref } from "./href";

/** Synthetic copy for the 05.01 evidence screen while sources load or fail. */
export const sourcesLoading: SourcesStateView = {
  title: "Loading the evidence",
  description: "Meeting brief · Anduril · Checking current source access",
  state: {
    kind: "loading",
    title: "Retrieving permitted sources",
    status: "Loading",
    detail:
      "Sources have not finished loading. No coverage or source count is claimed yet. Access and freshness are checked before any evidence is shown.",
  },
  action: {
    label: "Back to conversation",
    href: fixtureHref("research-progress"),
  },
};

export const sourcesUnavailable: SourcesStateView = {
  title: "Evidence could not be loaded",
  description: "Meeting brief · Anduril · Your conversation is preserved",
  state: {
    kind: "unavailable",
    title: "Source service unavailable",
    status: "Unavailable",
    detail:
      "The source request failed. This does not mean no evidence exists. Previously restricted content is not substituted. Try the read again or return to the conversation.",
  },
  action: { label: "Try again" },
};
