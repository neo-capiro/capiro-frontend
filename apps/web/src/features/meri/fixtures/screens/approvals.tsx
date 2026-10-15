import { ApprovalsScreen } from "../../screens/approvals/ApprovalsScreen";
import { ProposalReviewScreen } from "../../screens/approvals/ProposalReviewScreen";
import {
  TaskDraftScreen,
  type TaskDraftView,
} from "../../screens/approvals/TaskDraftScreen";
import {
  ActionReceiptsScreen,
  type ActionReceiptsView,
} from "../../screens/approvals/ActionReceiptsScreen";
import { ProposalDecisionScreen } from "../../screens/approvals/ProposalDecisionScreen";
import { RequestChangesScreen } from "../../screens/approvals/RequestChangesScreen";
import { DecisionOutcomeScreen } from "../../screens/approvals/DecisionOutcomeScreen";
import {
  approvals,
  approvalsAfterFiling,
  approvalsAfterMemory,
  approvalsAfterTask,
} from "./approvals-center";
import {
  decision,
  filingChangesRequested,
  filingRejected,
  requestFilingChanges,
  requestMemoryChanges,
  sourceAccessReview,
  taskChangesRequested,
  taskRejected,
} from "./approvals-decisions";
import {
  executedTask,
  filingReview,
  memoryReview,
  memoryReviewer,
  taskReview,
} from "./approvals-reviews";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

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

const receipts: ActionReceiptsView = {
  receipts: [
    {
      proposalId: "TP-2048",
      status: "Task created",
      title: "Confirm restoration request owner and timing",
      fields: [
        {
          label: "Created task / reviewed proposal",
          value: "TASK-2048 · From TP-2048",
        },
        { label: "Client / owner", value: "Anduril / Jordan Clayton" },
        { label: "Due date", value: "10 Oct 2026" },
        { label: "Approved by", value: "Jordan Clayton · 10:49 AM" },
        {
          label: "Outcome",
          value: "Created once · Duplicate retry returned this receipt",
        },
      ],
      actionLabel: "View proposal",
      actionHref: fixtureHref("executed-task-proposal"),
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
};

const u = fixtureUnavailable;

export const approvalScreens: readonly FixtureScreen[] = [
  {
    slug: "approval-center",
    figmaId: "06.01",
    figmaNode: "1064:147397",
    title: "Approval center",
    Screen: () => <ApprovalsScreen view={approvals} unavailable={u} />,
  },
  {
    slug: "approvals-after-task-decision",
    figmaId: "06.01A",
    figmaNode: "3036:33107",
    title: "Approvals after task decision",
    Screen: () => <ApprovalsScreen view={approvalsAfterTask} unavailable={u} />,
  },
  {
    slug: "approvals-after-filing-decision",
    figmaId: "06.01B",
    figmaNode: "3036:38096",
    title: "Approvals after filing decision",
    Screen: () => (
      <ApprovalsScreen view={approvalsAfterFiling} unavailable={u} />
    ),
  },
  {
    slug: "approvals-after-memory-decision",
    figmaId: "06.01C",
    figmaNode: "3048:39000",
    title: "Approvals after memory decision",
    Screen: () => (
      <ApprovalsScreen view={approvalsAfterMemory} unavailable={u} />
    ),
  },
  {
    slug: "memory-approval-review",
    figmaId: "06.02",
    figmaNode: "1064:147483",
    title: "Memory approval review",
    Screen: () => <ProposalReviewScreen view={memoryReview} unavailable={u} />,
  },
  {
    slug: "memory-review-authorized-reviewer",
    figmaId: "06.02A",
    figmaNode: "3027:28352",
    title: "Authorized memory reviewer perspective",
    Screen: () => (
      <ProposalReviewScreen view={memoryReviewer} unavailable={u} />
    ),
  },
  {
    slug: "request-memory-changes",
    figmaId: "06.02B",
    figmaNode: "3036:38962",
    title: "Request memory proposal changes",
    Screen: () => (
      <RequestChangesScreen view={requestMemoryChanges} unavailable={u} />
    ),
  },
  {
    slug: "draft-client-task",
    figmaId: "06.03",
    figmaNode: "1064:147566",
    title: "Draft a client task",
    Screen: () => <TaskDraftScreen view={taskDraft} unavailable={u} />,
  },
  {
    slug: "review-task-action",
    figmaId: "06.04",
    figmaNode: "1064:147638",
    title: "Review exact task action",
    Screen: () => <ProposalReviewScreen view={taskReview} unavailable={u} />,
  },
  {
    slug: "executed-task-proposal",
    figmaId: "06.04A",
    figmaNode: "3036:33726",
    title: "Executed task proposal",
    Screen: () => <ProposalReviewScreen view={executedTask} unavailable={u} />,
  },
  {
    slug: "review-artifact-filing",
    figmaId: "06.05",
    figmaNode: "1064:147729",
    title: "Review artifact filing",
    Screen: () => <ProposalReviewScreen view={filingReview} unavailable={u} />,
  },
  {
    slug: "artifact-filing-rejected",
    figmaId: "06.05A",
    figmaNode: "3036:38733",
    title: "Artifact filing rejected",
    Screen: () => (
      <DecisionOutcomeScreen view={filingRejected} unavailable={u} />
    ),
  },
  {
    slug: "action-receipts",
    figmaId: "06.06",
    figmaNode: "1064:147820",
    title: "Approved action receipts",
    Screen: () => <ActionReceiptsScreen view={receipts} unavailable={u} />,
  },
  {
    slug: "reject-or-request-changes",
    figmaId: "06.07",
    figmaNode: "1064:147899",
    title: "Reject or request changes",
    Screen: () => <ProposalDecisionScreen view={decision} unavailable={u} />,
  },
  {
    slug: "request-filing-changes",
    figmaId: "06.07A",
    figmaNode: "3036:38540",
    title: "Request artifact filing changes",
    Screen: () => (
      <RequestChangesScreen view={requestFilingChanges} unavailable={u} />
    ),
  },
  {
    slug: "filing-changes-requested",
    figmaId: "06.07B",
    figmaNode: "3036:38314",
    title: "Artifact filing changes requested",
    Screen: () => (
      <DecisionOutcomeScreen view={filingChangesRequested} unavailable={u} />
    ),
  },
  {
    slug: "task-proposal-rejected",
    figmaId: "06.07C",
    figmaNode: "3036:33325",
    title: "Task proposal rejected",
    Screen: () => <DecisionOutcomeScreen view={taskRejected} unavailable={u} />,
  },
  {
    slug: "task-changes-requested",
    figmaId: "06.07D",
    figmaNode: "3036:33519",
    title: "Task changes requested",
    Screen: () => (
      <DecisionOutcomeScreen view={taskChangesRequested} unavailable={u} />
    ),
  },
  {
    slug: "source-access-review",
    figmaId: "06.08",
    figmaNode: "3024:26758",
    title: "Source access approval review",
    Screen: () => (
      <DecisionOutcomeScreen view={sourceAccessReview} unavailable={u} />
    ),
  },
];
