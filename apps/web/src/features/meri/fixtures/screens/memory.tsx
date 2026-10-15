import {
  MemoryRecallScreen,
  type MemoryRecallView,
} from "../../screens/memory/MemoryRecallScreen";
import {
  MemoryDetailScreen,
  type MemoryDetailView,
} from "../../screens/memory/MemoryDetailScreen";
import {
  MemoryProposalScreen,
  type MemoryProposalView,
} from "../../screens/memory/MemoryProposalScreen";
import {
  MemoryApprovedScreen,
  type MemoryApprovedView,
} from "../../screens/memory/MemoryApprovedScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

const currentFact =
  "Keep client briefs concise and include direct source links.";
const proposedFact =
  "Use a one-page executive summary, with source links and detailed evidence in an appendix.";

const recall: MemoryRecallView = {
  client: "Anduril",
  initialQuery: "Anduril priorities",
  items: [
    {
      id: "client-priority",
      title: "Client priority · Current",
      meta: "Approved · Anduril · Owned by client team",
      fact: currentFact,
      status: { label: "Current", tone: "success" },
      historical: false,
      terms: ["priorities", "briefing"],
      evidenceHref: fixtureHref("memory-detail"),
      correctionHref: fixtureHref("memory-proposal"),
    },
    {
      id: "briefing-format",
      title: "Preferred briefing format",
      meta: "Personal · Jordan Clayton",
      fact: "Use a one-page executive summary before the detailed appendix.",
      status: { label: "Current", tone: "neutral" },
      historical: false,
      terms: ["priorities", "briefing", "format"],
    },
    {
      id: "funding-assumption",
      title: "Funding assumption · Superseded",
      meta: "Historical · Valid through 7 Oct",
      fact: "Replaced after the latest public funding update.",
      status: { label: "Historical", tone: "warning" },
      historical: true,
      terms: ["priorities", "funding"],
      evidenceHref: fixtureHref("coverage-details"),
    },
  ],
};

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

const proposal: MemoryProposalView = {
  title: "Update briefing preference",
  reference: "Proposal MP-1042 · Anduril",
  currentFact,
  proposedFact,
  owner: "Anduril client team",
  visibility: "Authorized client team",
  reason: "Strategy review note · 7 Oct · Explicit client preference",
};

const approved: MemoryApprovedView = {
  description: "Approved fact · Anduril · MP-1042",
  review:
    "Approved by Jordan Clayton at 10:49 AM. The previous fact is retained as superseded history.",
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

export const memoryScreens: readonly FixtureScreen[] = [
  {
    slug: "memory-recall",
    figmaId: "05.04",
    figmaNode: "1064:147042",
    title: "Institutional Memory recall",
    Screen: () => (
      <MemoryRecallScreen view={recall} unavailable={fixtureUnavailable} />
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
    slug: "memory-proposal",
    figmaId: "05.06",
    figmaNode: "1064:147204",
    title: "Memory update proposal",
    Screen: () => (
      <MemoryProposalScreen
        view={proposal}
        closeHref={fixtureHref("memory-detail")}
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
        memoryHref={fixtureHref("memory-recall")}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
