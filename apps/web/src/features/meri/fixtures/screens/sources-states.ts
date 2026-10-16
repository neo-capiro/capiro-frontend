import type { SourcesStateView } from "../../screens/sources/SourcesStateScreen";
import { fixtureHref } from "./href";

/** Synthetic copy for the 05.01 evidence screen while sources load, fail or retry. */
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
  /** 01.02 Cited answer owns these sources; it is its own static fixture route, outside the screen registry. */
  action: { label: "Back to conversation", href: "/meri/fixture/cited-answer" },
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
  action: { label: "Try again", href: fixtureHref("sources-retrying") },
};

/** 05.22A: the retried read is in flight; like 05.21 it claims no count or absence. */
export const sourcesRetrying: SourcesStateView = {
  title: "Retrying the evidence read",
  description: "Meeting brief · Anduril · Your conversation is preserved",
  state: {
    kind: "loading",
    title: "Retrying source request",
    status: "Retrying",
    detail:
      "Reading the authorized sources again. No evidence is shown until this read completes. A zero-result view never proves absence, and previously restricted content is not substituted.",
  },
  action: { label: "Retrying…" },
};
