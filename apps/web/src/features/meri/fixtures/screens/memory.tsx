import { MemoryRecallScreen } from "../../screens/memory/MemoryRecallScreen";
import {
  MemoryDetailScreen,
  type MemoryDetailView,
} from "../../screens/memory/MemoryDetailScreen";
import {
  MemoryApprovedScreen,
  type MemoryApprovedView,
} from "../../screens/memory/MemoryApprovedScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import {
  currentFact,
  history,
  historyNoMatches,
  proposedFact,
  recallAfterApproval,
  recallBefore,
  supersededHistory,
} from "./memory-records";
import type { FixtureScreen } from "./types";

const detail: MemoryDetailView = {
  title: "Client briefing preference",
  description: "Current approved fact · Anduril",
  fact: currentFact,
  fields: [
    { label: "Owner", value: "Anduril client team" },
    { label: "Visibility", value: "Authorized client team" },
    { label: "Status", value: "Approved · Current" },
    { label: "Valid since", value: "7 Oct 2026" },
    { label: "Last reviewed", value: "8 Oct 2026" },
    { label: "Evidence", value: "Strategy review meeting note" },
  ],
  evidence: [
    {
      id: "strategy",
      title: "Strategy review · 7 Oct",
      meta: "Meeting note · Authorized excerpt",
      summary:
        "The client asked for a concise brief with direct source references.",
    },
  ],
  conflict: {
    title: "Conflicting history is labeled",
    detail: "An older preference for longer reports was superseded on 7 Oct.",
  },
};

const approved: MemoryApprovedView = {
  description: "Approved fact · Anduril · MP-1042",
  review:
    "Approved by an authorized client reviewer at 10:49 AM. The previous fact is retained as superseded history.",
  fact: proposedFact,
  fields: [
    {
      label: "Owner / visibility",
      value: "Anduril client team / Authorized team",
    },
    { label: "Evidence", value: "Strategy review meeting note · 7 Oct" },
    { label: "Status", value: "Approved · Current" },
    { label: "Effective since", value: "9 Oct 2026, 10:49 AM" },
    { label: "Previous fact", value: "Superseded; preserved in history" },
  ],
};

/** Before approval, History opens 05.04B (05.04C when its search matches nothing); after it, the views pair 05.08A with 05.08B. */
const beforeApproval = {
  current: fixtureHref("memory-recall"),
  history: fixtureHref("memory-history"),
};
const afterApproval = {
  current: fixtureHref("memory-current-approved"),
  history: fixtureHref("memory-superseded"),
};

export const memoryScreens: readonly FixtureScreen[] = [
  {
    slug: "memory-recall",
    figmaId: "05.04",
    figmaNode: "1064:147042",
    title: "Institutional Memory recall",
    Screen: () => (
      <MemoryRecallScreen
        view={recallBefore}
        viewHrefs={beforeApproval}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "memory-history",
    figmaId: "05.04B",
    figmaNode: "3019:23371",
    title: "Institutional Memory history",
    Screen: () => (
      <MemoryRecallScreen
        view={history}
        viewHrefs={beforeApproval}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "memory-history-no-matches",
    figmaId: "05.04C",
    figmaNode: "3062:39816",
    title: "Institutional Memory history — no matching history",
    Screen: () => (
      <MemoryRecallScreen
        view={historyNoMatches}
        viewHrefs={beforeApproval}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "memory-detail",
    figmaId: "05.05",
    figmaNode: "1064:147112",
    title: "Memory detail and provenance",
    Screen: () => (
      <MemoryDetailScreen
        view={detail}
        compareHref={fixtureHref("memory-conflict")}
        correctionHref={fixtureHref("memory-proposal")}
        evidenceHref={fixtureHref("evidence-sources")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "memory-approved",
    figmaId: "05.08",
    figmaNode: "1064:147320",
    title: "Approved memory outcome",
    Screen: () => (
      <MemoryApprovedScreen
        view={approved}
        evidenceHref={fixtureHref("evidence-sources")}
        memoryHref={fixtureHref("memory-current-approved")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "memory-current-approved",
    figmaId: "05.08A",
    figmaNode: "3019:23613",
    title: "Current memory after approval",
    Screen: () => (
      <MemoryRecallScreen
        view={recallAfterApproval}
        viewHrefs={afterApproval}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "memory-superseded",
    figmaId: "05.08B",
    figmaNode: "3050:34741",
    title: "Superseded briefing preference",
    Screen: () => (
      <MemoryRecallScreen
        view={supersededHistory}
        viewHrefs={afterApproval}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
