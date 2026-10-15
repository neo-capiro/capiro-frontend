import {
  ApprovalsScreen,
  type ApprovalsView,
} from "../../screens/approvals/ApprovalsScreen";
import {
  ProposalReviewScreen,
  type ProposalReviewView,
} from "../../screens/approvals/ProposalReviewScreen";
import {
  TaskDraftScreen,
  type TaskDraftView,
} from "../../screens/approvals/TaskDraftScreen";
import {
  ActionReceiptsScreen,
  type ActionReceiptsView,
} from "../../screens/approvals/ActionReceiptsScreen";
import {
  ProposalDecisionScreen,
  type ProposalDecisionView,
} from "../../screens/approvals/ProposalDecisionScreen";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

const approvals: ApprovalsView = {
  pending: [
    {
      id: "MP-1042",
      proposal: "MP-1042 · Briefing preference",
      client: "Anduril",
      action: "Memory replacement",
      expires: "Today, 11:15 AM",
    },
    {
      id: "TP-2048",
      proposal: "TP-2048 · Restoration follow-up",
      client: "Anduril",
      action: "Create task",
      expires: "Today, 11:20 AM",
    },
    {
      id: "FL-1042",
      proposal: "FL-1042 · Meeting brief v2",
      client: "Anduril",
      action: "File artifact version",
      expires: "Today, 11:30 AM",
    },
  ],
  history: [
    {
      id: "TP-2031",
      proposal: "TP-2031 · Hearing follow-up",
      client: "Anduril",
      action: "Create task · Approved",
      expires: "Closed 9 Oct",
    },
  ],
  reviews: [
    {
      label: "Review memory update",
      href: fixtureHref("memory-approval-review"),
    },
    { label: "Review task", href: fixtureHref("review-task-action") },
    {
      label: "Review artifact filing",
      href: fixtureHref("review-artifact-filing"),
    },
  ],
};

const memoryReview: ProposalReviewView = {
  title: "Review memory update",
  description: "MP-1042 · Requested by Jordan Clayton · Expires 11:15 AM",
  proposalId: "MP-1042",
  summary: "Replace the approved briefing preference",
  approveLabel: "Approve update",
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
};

const taskDraft: TaskDraftView = {
  heading: "Restoration follow-up",
  context: "Task proposal · Anduril",
  draft: {
    title: "Confirm restoration request owner and timing",
    description:
      "Follow up on the open restoration request from the 7 Oct strategy review.",
    owner: "Jordan Clayton",
    dueDate: "10 Oct 2026",
  },
  client: "Anduril",
  evidence: "Task TASK-2047 · Strategy review note",
  closeHref: fixtureHref("approval-center"),
};

const taskReview: ProposalReviewView = {
  title: "Review task creation",
  description: "TP-2048 · Expires 11:20 AM · Pending",
  proposalId: "TP-2048",
  summary: "Create one task in Anduril",
  approveLabel: "Approve and create task",
  fields: [
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
  ],
  requestChangesHref: fixtureHref("reject-or-request-changes"),
};

const filingReview: ProposalReviewView = {
  title: "Review filing proposal",
  description: "FL-1042 · Expires 11:30 AM · Pending",
  proposalId: "FL-1042",
  summary: "File this exact artifact version",
  approveLabel: "Approve and file",
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
};

const receipts: ActionReceiptsView = {
  receipts: [
    {
      proposalId: "TP-2048",
      status: "Task created",
      title: "Confirm restoration request owner and timing",
      fields: [
        { label: "Task reference", value: "TASK-2048" },
        { label: "Client / owner", value: "Anduril / Jordan Clayton" },
        { label: "Due date", value: "10 Oct 2026" },
        { label: "Approved by", value: "Jordan Clayton · 10:49 AM" },
        {
          label: "Outcome",
          value: "Created once · Duplicate retry returned this receipt",
        },
      ],
      actionLabel: "View proposal",
    },
    {
      proposalId: "MP-1042",
      status: "Memory approved",
      title: "Briefing preference updated",
      summary:
        "MP-1042 · Current fact replaced after review. Previous fact retained as superseded history.",
      actionLabel: "Open current memory",
    },
  ],
  created: {
    title: "Task created",
    detail: "TASK-2048 · Anduril · Jordan Clayton · Due 10 Oct",
    status: "Completed once",
  },
};

const decision: ProposalDecisionView = {
  proposalId: "TP-2048",
  context: "TP-2048 · Pending task proposal",
  requestedChange:
    "Move the due date to 12 Oct and add the missing meeting-note reference.",
  rejection: {
    title: "TP-2048 was rejected · No task was created",
    detail:
      "Decision by Jordan Clayton · 10:49 AM · Reason recorded with the proposal.",
  },
  reviewHref: fixtureHref("review-task-action"),
  approvalsHref: fixtureHref("approval-center"),
};

export const approvalScreens: readonly FixtureScreen[] = [
  {
    slug: "approval-center",
    figmaId: "06.01",
    figmaNode: "1064:147397",
    title: "Approval center",
    Screen: () => (
      <ApprovalsScreen view={approvals} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "memory-approval-review",
    figmaId: "06.02",
    figmaNode: "1064:147483",
    title: "Memory approval review",
    Screen: () => (
      <ProposalReviewScreen
        view={memoryReview}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "draft-client-task",
    figmaId: "06.03",
    figmaNode: "1064:147566",
    title: "Draft a client task",
    Screen: () => (
      <TaskDraftScreen view={taskDraft} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "review-task-action",
    figmaId: "06.04",
    figmaNode: "1064:147638",
    title: "Review exact task action",
    Screen: () => (
      <ProposalReviewScreen
        view={taskReview}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "review-artifact-filing",
    figmaId: "06.05",
    figmaNode: "1064:147729",
    title: "Review artifact filing",
    Screen: () => (
      <ProposalReviewScreen
        view={filingReview}
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "action-receipts",
    figmaId: "06.06",
    figmaNode: "1064:147820",
    title: "Approved action receipts",
    Screen: () => (
      <ActionReceiptsScreen view={receipts} unavailable={fixtureUnavailable} />
    ),
  },
  {
    slug: "reject-or-request-changes",
    figmaId: "06.07",
    figmaNode: "1064:147899",
    title: "Reject or request changes",
    Screen: () => (
      <ProposalDecisionScreen
        view={decision}
        unavailable={fixtureUnavailable}
      />
    ),
  },
];
