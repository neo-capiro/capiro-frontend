import type { MemoryProposalView } from "../../screens/memory/proposal-phases";
import { fixtureHref } from "./href";
import {
  backToMemory,
  proposalTitle,
  sharedMemory,
} from "./memory-proposal-states";
import { proposalContent } from "./memory-records";

/** Synthetic copy for the recovery frames of the memory proposal lifecycle (05.17–05.20A). */
export const submissionError: MemoryProposalView = {
  phase: "submission-error",
  heading: "Your proposal was not submitted",
  description: sharedMemory("Your draft is still here"),
  title: proposalTitle,
  context: "Proposal MP-1042 · Anduril · Unsubmitted draft",
  status: { label: "Draft retained", tone: "danger" },
  feedback: {
    tone: "danger",
    title: "Couldn’t send the proposal",
    lines: [
      "Your proposed replacement, scope and cited evidence are retained. Retry this draft when your connection is available.",
    ],
  },
  content: proposalContent,
  footnote:
    "The current approved fact is unchanged. Retry continues this draft instead of creating a separate proposal.",
  secondary: backToMemory,
  primary: { label: "Retry submission" },
};

/** The decision outcome is unknown: the only next step is a status read, never a repeated decision. */
export const statusUncertain: MemoryProposalView = {
  phase: "status-uncertain",
  heading: "Confirm the reviewer decision",
  description: sharedMemory("Read the latest status before continuing"),
  title: proposalTitle,
  context: "Proposal MP-1042 · Anduril · Read-only until status is confirmed",
  status: { label: "Check status", tone: "warning" },
  feedback: {
    tone: "warning",
    title: "The decision could not be confirmed",
    lines: [
      "The response was interrupted after a review decision. Its saved status is unknown. Check the latest proposal status before attempting another decision.",
    ],
  },
  content: proposalContent,
  footnote:
    "Checking status is read-only. The interface does not automatically retry an approval or rejection.",
  secondary: backToMemory,
  primary: {
    label: "Check status",
    href: fixtureHref("memory-review-status-confirmed"),
  },
};

const reviewRevision = (label: string) => ({
  label,
  href: fixtureHref("memory-review-authorized-reviewer"),
});
const stillPending = { label: "Pending review", tone: "warning" } as const;

/** 05.18A: the read-only status read found no decision; a new decision is made explicitly in 06.02A. */
export const statusConfirmed: MemoryProposalView = {
  phase: "pending",
  heading: "Decision status confirmed",
  description: sharedMemory("Latest recorded status"),
  title: proposalTitle,
  context: "Proposal MP-1042 · Anduril · Status read at 10:52 AM",
  status: stillPending,
  feedback: {
    tone: "warning",
    title: "No decision recorded · Pending review",
    lines: [
      "The status read found no recorded reviewer decision. MP-1042 is still pending and unchanged, and the approved fact remains current.",
    ],
  },
  content: proposalContent,
  footnote:
    "This was a read-only status check. No approval, rejection or replacement was written or repeated. Any new decision must be made explicitly on the displayed proposal.",
  secondary: backToMemory,
  primary: reviewRevision("Return to review"),
};

export const restricted: MemoryProposalView = {
  phase: "restricted",
  heading: "Review access required",
  description: sharedMemory("This action is restricted"),
  title: "Memory proposals",
  context: "Anduril · Restricted reviewer action",
  status: { label: "Review access required", tone: "warning" },
  feedback: {
    tone: "warning",
    title: "You can’t review this proposal",
    lines: [
      "Your current role does not include reviewing Anduril shared memory. Contact an authorized client administrator if you need review access.",
    ],
  },
  footnote:
    "No proposal content or reviewer actions are shown without the required permission.",
  secondary: { label: "Close", href: fixtureHref("memory-recall") },
  primary: backToMemory,
};

export const changed: MemoryProposalView = {
  phase: "changed",
  heading: "This proposal has changed",
  description: sharedMemory("Your open copy is no longer current"),
  title: proposalTitle,
  context: "Proposal MP-1042 · Anduril · Stale copy · Read-only",
  status: { label: "Refresh required", tone: "warning" },
  feedback: {
    tone: "warning",
    title: "Refresh before continuing",
    lines: [
      "Another reviewer or a newer memory revision changed this proposal. Load its current status before editing or making a decision.",
    ],
  },
  content: proposalContent,
  footnote:
    "No stale decision or replacement is applied. Refreshing reads the latest proposal without resubmitting it.",
  secondary: backToMemory,
  primary: {
    label: "Refresh proposal",
    href: fixtureHref("memory-proposal-refreshed"),
  },
};

/** 05.20A: the latest recorded revision replaced the stale copy; nothing from it was applied. */
export const refreshed: MemoryProposalView = {
  phase: "pending",
  heading: "Proposal refreshed",
  description: sharedMemory("Showing the latest recorded revision"),
  title: proposalTitle,
  context: "Proposal MP-1042 · Anduril · Latest revision · Refreshed just now",
  status: stillPending,
  feedback: {
    tone: "neutral",
    title: "Showing the latest revision",
    lines: [
      "This view was reloaded from the proposal’s current recorded state. Nothing from the stale copy was applied or resubmitted.",
    ],
  },
  content: proposalContent,
  footnote:
    "Review the displayed revision, scope and evidence before making a decision. A decision covers only this revision.",
  secondary: backToMemory,
  primary: reviewRevision("Review this revision"),
};
