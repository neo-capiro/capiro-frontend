import type { DecisionOutcomeView } from "../../screens/approvals/DecisionOutcomeScreen";
import type { ProposalDecisionView } from "../../screens/approvals/ProposalDecisionScreen";
import type { Rejection } from "../../screens/approvals/RejectedOutcome";
import type { RequestChangesScreenView } from "../../screens/approvals/RequestChangesScreen";
import { fixtureHref } from "./href";

const closesProposal =
  "The current proposal will be closed. Meri prepares a new proposal for review with the changed details.";

const taskRejection: Rejection = {
  proposalId: "TP-2048",
  title: "TP-2048 was rejected · No task was created",
  detail:
    "Decision by Jordan Clayton · 10:49 AM · The reason remains with the immutable proposal. Source task TASK-2047 is unchanged.",
  approvalsHref: fixtureHref("approvals-after-task-decision"),
};

/** 06.07 Reject or request changes. */
export const decision: ProposalDecisionView = {
  requestChanges: {
    context: "TP-2048 · Pending task proposal",
    requestedChange:
      "Move the due date to 12 Oct and add the missing meeting-note reference.",
    guidance: closesProposal,
    submitLabel: "Request a new proposal",
    closeHref: fixtureHref("review-task-action"),
  },
  rejection: {
    ...taskRejection,
    detail:
      "Decision by Jordan Clayton · 10:49 AM · Reason recorded with the proposal.",
    approvalsHref: fixtureHref("approval-center"),
  },
};

/** 06.02B: feedback returns MP-1042 to its proposer and activates nothing. */
export const requestMemoryChanges: RequestChangesScreenView = {
  title: "Request memory changes",
  description:
    "Another authorized client reviewer · Jordan Clayton is the proposer",
  requestChanges: {
    context: "MP-1042 · Pending shared-memory replacement",
    requestedChange:
      "Keep direct source links in the executive summary and clarify how appendix evidence will remain accessible.",
    guidance:
      "The current revision stays immutable. The proposer must revise and submit a new revision for review; feedback does not activate a memory change.",
    submitLabel: "Send feedback",
    closeHref: fixtureHref("memory-review-authorized-reviewer"),
  },
};

/** 06.07A: filing feedback applies only to FL-1042. */
export const requestFilingChanges: RequestChangesScreenView = {
  title: "Review filing changes",
  description:
    "Feedback applies only to FL-1042 · The reviewed payload stays immutable",
  requestChanges: {
    context: "FL-1042 · Pending artifact filing proposal",
    requestedChange:
      "Use the filename Anduril meeting brief — executive summary.docx. Keep exact version v2 and all source restrictions.",
    guidance: closesProposal,
    submitLabel: "Send feedback",
    closeHref: fixtureHref("review-artifact-filing"),
  },
};

const toFilingApprovals = {
  label: "Return to approvals",
  href: fixtureHref("approvals-after-filing-decision"),
};

/** 06.05A */
export const filingRejected: DecisionOutcomeView = {
  title: "Artifact filing rejected",
  description: "FL-1042 · Decision recorded · No copy filed",
  outcome: {
    kind: "state",
    title: "Filing was not approved",
    tone: "warning",
    status: "Needs attention",
    detail:
      "The displayed filing proposal was rejected. Version v2, its source provenance and current permissions are unchanged. A different filename, scope or destination requires a new proposal.",
    action: toFilingApprovals,
  },
};

/** 06.07B */
export const filingChangesRequested: DecisionOutcomeView = {
  title: "Artifact filing changes requested",
  description: "FL-1042 · Feedback recorded · No artifact copy filed",
  outcome: {
    kind: "state",
    title: "A new filing proposal is required",
    tone: "warning",
    status: "Needs attention",
    detail:
      "Requested filename: Anduril meeting brief — executive summary.docx. Keep exact version v2, the destination and all contributing source restrictions. FL-1042 remains immutable and is closed to execution. Meri must prepare another proposal; this feedback does not authorize filing.",
    action: toFilingApprovals,
  },
};

/** 06.07C */
export const taskRejected: DecisionOutcomeView = {
  title: "Task proposal rejected",
  description: "TP-2048 · Decision recorded · No task was created",
  outcome: { kind: "rejected", ...taskRejection },
};

/** 06.07D */
export const taskChangesRequested: DecisionOutcomeView = {
  title: "Task changes requested",
  description: "TP-2048 · Feedback recorded · No task created",
  outcome: {
    kind: "state",
    title: "A replacement proposal is required",
    tone: "warning",
    status: "Needs attention",
    detail:
      "Move the proposed due date to 12 Oct and add the 7 Oct meeting-note reference. TP-2048 stays immutable and is no longer executable. Meri must prepare a new proposal for review; your feedback does not approve that future payload. Source task TASK-2047 is unchanged.",
    action: {
      label: "Return to approvals",
      href: fixtureHref("approvals-after-task-decision"),
    },
  },
};

/** 06.08: reviewing AR-1042; the request itself grants no access and files no copy. */
export const sourceAccessReview: DecisionOutcomeView = {
  title: "Review contributing source access",
  description:
    "AR-1042 · Exact version v2 · Assigned to an authorized source owner",
  outcome: {
    kind: "state",
    title: "Mailbox J. Clayton → Authorized Anduril team",
    tone: "warning",
    status: "Needs attention",
    detail:
      "Requested access: permit the Anduril team to open the mailbox contribution in meeting-brief-v2.docx v2. Existing source lineage stays attached. Approval cannot grant unrelated mailbox access or change the artifact content. Current status: Pending. If the provider cannot apply a narrower grant, the request remains blocked.",
    action: { label: "Return to artifact access" },
  },
};
