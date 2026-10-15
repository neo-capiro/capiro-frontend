import type { MemoryProposalView } from "../../screens/memory/proposal-phases";
import { fixtureHref } from "./href";
import {
  backToMemory,
  proposalTitle,
  sharedMemory,
} from "./memory-proposal-states";
import { proposalContent } from "./memory-records";

/** Synthetic copy for the recovery frames of the memory proposal lifecycle (05.17–05.20). */
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
  primary: { label: "Check status" },
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
  primary: { label: "Refresh proposal" },
};
