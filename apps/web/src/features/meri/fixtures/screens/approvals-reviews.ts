import type { FieldRow } from "../../ui/FieldTable";
import type { ProposalReviewView } from "../../screens/approvals/ProposalReviewScreen";
import { fixtureHref } from "./href";

const memoryProposal = {
  proposalId: "MP-1042",
  summary: "Replace the approved briefing preference",
  comparison: {
    current: "Keep client briefs concise and include direct source links.",
    proposed:
      "Use a one-page executive summary, with source links and detailed evidence in an appendix.",
  },
  fields: [
    { label: "Action", value: "Replace current approved fact after review" },
    { label: "Client / owner", value: "Anduril / Anduril client team" },
    { label: "Visibility", value: "Authorized client team" },
    { label: "Evidence", value: "Strategy review note · 7 Oct" },
    { label: "Proposal state", value: "Pending · Arguments fixed" },
  ],
} as const;

/** 06.02 proposer view: Jordan Clayton cannot approve their own shared-memory proposal. */
export const memoryReview: ProposalReviewView = {
  ...memoryProposal,
  title: "Awaiting memory review",
  description:
    "Proposed by Jordan Clayton · Another authorized client reviewer is required",
  decision: {
    state: "pending",
    approveLabel: "Approve update",
    proposer: {},
  },
};

/** 06.02A: a different authorized reviewer decides only this revision and scope. */
export const memoryReviewer: ProposalReviewView = {
  ...memoryProposal,
  title: "Review memory update",
  description:
    "Authorized reviewer perspective · Requested by Jordan Clayton · Another authorized account",
  decision: {
    state: "pending",
    approveLabel: "Approve update",
    requestChangesHref: fixtureHref("request-memory-changes"),
    reviewer: {
      title: "You are reviewing as another authorized client reviewer",
      body: "Jordan Clayton submitted MP-1042. The proposer cannot approve their own shared memory change. Approval covers only the exact replacement, scope and evidence displayed below.",
    },
  },
};

/** TP-2048's immutable payload; TASK-2047 is its distinct source task. */
const taskFields: readonly FieldRow[] = [
  { label: "Action", value: "Create client task" },
  { label: "Title", value: "Confirm restoration request owner and timing" },
  {
    label: "Description",
    value: "Follow up on the open request from the 7 Oct review",
  },
  { label: "Client", value: "Anduril" },
  { label: "Owner", value: "Jordan Clayton" },
  { label: "Due date", value: "10 Oct 2026" },
  { label: "Evidence", value: "TASK-2047 and strategy review note" },
  {
    label: "Retry behavior",
    value: "Same proposal returns the existing creation receipt",
  },
];

export const taskReview: ProposalReviewView = {
  title: "Review task creation",
  description: "TP-2048 · Expires 11:20 AM · Pending",
  proposalId: "TP-2048",
  summary: "Create one task in Anduril",
  fields: taskFields,
  decision: {
    state: "pending",
    approveLabel: "Approve and create task",
    requestChangesHref: fixtureHref("reject-or-request-changes"),
  },
};

/** 06.04A: the approved payload executed once and created TASK-2048. */
export const executedTask: ProposalReviewView = {
  title: "Task proposal completed",
  description: "TP-2048 · Approved exact payload · Created task TASK-2048",
  proposalId: "TP-2048",
  summary: "Create one task in Anduril",
  fields: taskFields,
  decision: {
    state: "executed",
    receiptHref: fixtureHref("action-receipts"),
    created: {
      title: "Task created",
      detail: "TASK-2048 · Anduril · Jordan Clayton · Due 10 Oct",
      status: "Completed once",
    },
  },
};

export const filingReview: ProposalReviewView = {
  title: "Review filing proposal",
  description: "FL-1042 · Expires 11:30 AM · Pending",
  proposalId: "FL-1042",
  summary: "File this exact artifact version",
  fields: [
    { label: "Action", value: "File artifact version" },
    {
      label: "Artifact",
      value: "meeting-brief-v2.docx · Version 2 · Verified",
    },
    { label: "Client", value: "Anduril" },
    { label: "Folder", value: "Documents / Meeting briefs" },
    { label: "File name", value: "Anduril meeting brief — 9 Oct 2026.docx" },
    {
      label: "Effective visibility",
      value: "Team members able to read every contributing source",
    },
    {
      label: "Source permissions",
      value: "Restrictions preserved; filing does not widen access",
    },
    {
      label: "Retry behavior",
      value: "Existing receipt is returned without another copy",
    },
  ],
  decision: {
    state: "pending",
    approveLabel: "Approve and file",
    requestChangesHref: fixtureHref("request-filing-changes"),
  },
};
