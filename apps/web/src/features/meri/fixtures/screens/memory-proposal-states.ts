import type {
  MemoryProposalView,
  ProposalAction,
} from "../../screens/memory/proposal-phases";
import { fixtureHref } from "./href";
import { proposalContent } from "./memory-records";

/** Synthetic copy for each Figma 3.4 memory proposal lifecycle frame (05.06, 05.10–05.20). */
export const backToMemory: ProposalAction = {
  label: "Back to memory",
  href: fixtureHref("memory-recall"),
};
const reviseDraft: ProposalAction = {
  label: "Create revised draft",
  href: fixtureHref("memory-proposal-revised"),
};
export const proposalTitle = "Briefing preference proposal";
export const sharedMemory = (detail: string) =>
  `Anduril shared memory · ${detail}`;
const reviewed = "Reviewer: Authorized client reviewer · 9 Oct 2026, 10:49 AM";
const revisionOne = "Proposal MP-1042 · Anduril · Revision 1 · Read-only";

export const draft: MemoryProposalView = {
  phase: "draft",
  heading: "Propose a memory update",
  description: "Changes are sourced and reviewed before becoming canonical.",
  title: "Update briefing preference",
  context: "Proposal MP-1042 · Anduril",
  content: proposalContent,
  footnote:
    "This proposal replaces the current fact only after an authorized reviewer approves it.",
  secondary: { label: "Cancel", href: fixtureHref("memory-detail") },
  primary: { label: "Submit for review" },
};

export const submitting: MemoryProposalView = {
  phase: "submitting",
  heading: "Submitting your proposal",
  description: sharedMemory("Confirmation in progress"),
  title: proposalTitle,
  context: "Proposal MP-1042 · Anduril · Shared client memory",
  status: { label: "Submitting", tone: "neutral" },
  feedback: {
    tone: "neutral",
    title: "Sending for review",
    lines: [
      "The current approved fact remains active. Wait for confirmation before sending this proposal again.",
    ],
  },
  content: proposalContent,
  footnote:
    "Your proposed replacement is not active memory while submission is in progress.",
  secondary: { label: "Please wait" },
  primary: { label: "Submitting…" },
};

export const pending: MemoryProposalView = {
  phase: "pending",
  heading: "Proposal submitted",
  description: sharedMemory("Awaiting an authorized reviewer"),
  title: proposalTitle,
  context: "Proposal MP-1042 · Anduril · Latest submitted revision",
  status: { label: "Pending review", tone: "warning" },
  feedback: {
    tone: "warning",
    title: "Submitted · Pending review",
    lines: [
      "Your proposal has been recorded. It is not active memory. A different authorized client reviewer must approve this shared memory change.",
    ],
  },
  content: proposalContent,
  footnote:
    "Submitted by Jordan Clayton · Just now. The approved fact remains current until a reviewer accepts the proposal.",
  secondary: { label: "View evidence", href: fixtureHref("evidence-sources") },
  primary: backToMemory,
};

export const rejected: MemoryProposalView = {
  phase: "rejected",
  heading: "Proposal rejected",
  description: sharedMemory("Current approved fact retained"),
  title: proposalTitle,
  context: revisionOne,
  status: { label: "Rejected", tone: "danger" },
  feedback: {
    tone: "danger",
    title: "The reviewer rejected this revision",
    lines: [
      reviewed,
      "Reason: The evidence does not authorize replacing the shared client briefing standard.",
    ],
  },
  content: proposalContent,
  footnote:
    "Revision 1 and the reviewer decision are preserved. Creating a revised draft does not change or resubmit this rejected revision.",
  secondary: backToMemory,
  primary: reviseDraft,
};

export const changesRequested: MemoryProposalView = {
  phase: "changes-requested",
  heading: "Changes requested",
  description: sharedMemory("Clarify the scope before resubmitting"),
  title: proposalTitle,
  context: revisionOne,
  status: { label: "Changes requested", tone: "warning" },
  feedback: {
    tone: "warning",
    title: "Create a new revision to address feedback",
    lines: [
      reviewed,
      "Reason: Clarify whether this preference applies to all client briefs or only to meeting briefs.",
    ],
  },
  content: proposalContent,
  footnote:
    "This revision is immutable. Your next draft keeps the original proposal, evidence and reviewer feedback in its history.",
  secondary: backToMemory,
  primary: reviseDraft,
};

export const revised: MemoryProposalView = {
  phase: "revised",
  heading: "Revise the memory proposal",
  description: sharedMemory("A new draft based on reviewer feedback"),
  title: proposalTitle,
  context: "Proposal MP-1042 · Anduril · Revision 2 · Draft",
  status: { label: "Draft · Revision 2", tone: "neutral" },
  feedback: {
    tone: "neutral",
    title: "Revision 2 · Not submitted",
    lines: [
      "The earlier revision and its review remain unchanged. Confirm the requested scope against the cited evidence before submitting this new revision.",
    ],
  },
  content: {
    ...proposalContent,
    proposedFact:
      "Use a one-page executive summary for meeting briefs, with source links and detailed evidence in an appendix.",
    reason:
      "Strategy review note · 7 Oct · Verify the requested scope before submitting",
  },
  footnote:
    "Shared client memory still requires approval by an authorized reviewer other than the proposer.",
  secondary: backToMemory,
  primary: { label: "Submit revision 2" },
};

const queue = {
  title: "Memory proposals",
  context: "Anduril · Authorized client team",
  secondary: backToMemory,
} as const;

export const loading: MemoryProposalView = {
  ...queue,
  phase: "loading",
  heading: "Memory proposals",
  description: sharedMemory("Loading your review queue"),
  status: { label: "Loading", tone: "neutral" },
  feedback: {
    tone: "neutral",
    title: "Loading proposals",
    lines: [
      "Checking proposal status and your review permissions. Current approved memory remains available while the queue loads.",
    ],
  },
  footnote: "Proposal content will appear after this read completes.",
  primary: { label: "Loading…" },
};

export const loadError: MemoryProposalView = {
  ...queue,
  phase: "load-error",
  heading: "Memory proposals",
  description: sharedMemory("Review queue unavailable"),
  status: { label: "Could not load", tone: "danger" },
  feedback: {
    tone: "danger",
    title: "Couldn’t load proposals",
    lines: [
      "No proposal status is available. Your current approved memory is unchanged. Retry loading the queue to get the latest status.",
    ],
  },
  footnote:
    "Retry only refreshes the proposal list. It does not submit or approve a memory change.",
  primary: { label: "Retry loading" },
};
