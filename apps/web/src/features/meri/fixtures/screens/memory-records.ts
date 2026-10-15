import type { MemoryItem } from "../../screens/memory/MemoryCard";
import type { MemoryRecallView } from "../../screens/memory/MemoryRecallScreen";
import type { ProposalContent } from "../../screens/memory/proposal-phases";
import { fixtureHref } from "./href";

/** Synthetic Anduril briefing memory shared by recall, history, proposal and outcome fixtures. */
export const currentFact =
  "Keep client briefs concise and include direct source links.";
export const proposedFact =
  "Use a one-page executive summary, with source links and detailed evidence in an appendix.";

export const proposalContent: ProposalContent = {
  currentFact,
  proposedFact,
  owner: "Anduril client team",
  visibility: "Authorized client team",
  reason: "Strategy review note · 7 Oct · Explicit client preference",
};

const clientPriority = (fact: string): MemoryItem => ({
  id: "client-priority",
  title: "Client priority · Current",
  meta: "Approved · Anduril · Owned by client team",
  fact,
  status: { label: "Current", tone: "success" },
  terms: ["priorities", "briefing", "preference"],
  evidence: { label: "View evidence", href: fixtureHref("memory-detail") },
  correction: { href: fixtureHref("memory-proposal") },
});

const personalFormat: MemoryItem = {
  id: "briefing-format",
  title: "Preferred briefing format",
  meta: "Personal · Jordan Clayton",
  fact: "Use a one-page executive summary before the detailed appendix.",
  status: { label: "Current", tone: "neutral" },
  terms: ["briefing", "format", "preference"],
  evidence: { label: "View evidence" },
  correction: {},
};

/** Current memory: eligible governed recall plus a current personal preference. */
const current = (fact: string): MemoryRecallView => ({
  view: "current",
  title: "Institutional Memory",
  description:
    "2 current records · Active client and personal memory · Freshness is shown separately",
  client: "Anduril",
  initialQuery: "Briefing preference",
  items: [clientPriority(fact), personalFormat],
});

/** 05.04 before the proposal and 05.08A after its approval. */
export const recallBefore = current(currentFact);
export const recallAfterApproval = current(proposedFact);

/** 05.04B: superseded records, excluded from current memory. */
export const history: MemoryRecallView = {
  view: "history",
  title: "Institutional Memory history",
  description:
    "Superseded records retained for provenance. These records are excluded from current memory.",
  client: "Anduril",
  initialQuery: "Funding assumption",
  items: [
    {
      id: "funding-assumption",
      title: "Funding assumption · Superseded",
      meta: "Historical · Valid through 7 Oct",
      fact: "Replaced after the latest public funding update.",
      status: { label: "Historical", tone: "warning" },
      terms: ["funding", "assumption", "priorities"],
      evidence: {
        label: "View evidence",
        href: fixtureHref("coverage-details"),
      },
      correction: {},
    },
  ],
};

/** 05.08B: the replaced briefing preference, kept with its approval receipt. */
export const supersededHistory: MemoryRecallView = {
  view: "history",
  title: "Memory history after approval",
  description:
    "Previous briefing preference · Superseded 9 Oct 2026, 10:49 AM · Retained for provenance",
  client: "Anduril",
  initialQuery: "Briefing preference",
  items: [
    {
      id: "previous-briefing",
      title: "Briefing preference · Previous version",
      meta: "Superseded · Anduril · Approved replacement MP-1042",
      fact: currentFact,
      status: { label: "Superseded", tone: "neutral", compact: true },
      terms: ["briefing", "preference"],
      evidence: {
        label: "View approval receipt",
        href: fixtureHref("memory-approved"),
      },
    },
  ],
};
