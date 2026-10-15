import type {
  ApprovalRow,
  ApprovalReview,
  ApprovalsView,
} from "../../screens/approvals/ApprovalsScreen";
import { fixtureHref } from "./href";

const memoryRow: ApprovalRow = {
  id: "MP-1042",
  proposal: "MP-1042 · Briefing preference",
  client: "Anduril",
  action: "Memory replacement",
  expires: "Today, 11:15 AM",
};
const taskRow: ApprovalRow = {
  id: "TP-2048",
  proposal: "TP-2048 · Restoration follow-up",
  client: "Anduril",
  action: "Create task",
  expires: "Today, 11:20 AM",
};
const filingRow: ApprovalRow = {
  id: "FL-1042",
  proposal: "FL-1042 · Meeting brief v2",
  client: "Anduril",
  action: "File artifact version",
  expires: "Today, 11:30 AM",
};
const closedRow: ApprovalRow = {
  id: "TP-2031",
  proposal: "TP-2031 · Hearing follow-up",
  client: "Anduril",
  action: "Create task · Approved",
  expires: "Closed 9 Oct",
};

const reviews: readonly (ApprovalReview & { id: string })[] = [
  {
    id: memoryRow.id,
    label: "Review memory update",
    href: fixtureHref("memory-approval-review"),
  },
  {
    id: taskRow.id,
    label: "Review task",
    href: fixtureHref("review-task-action"),
  },
  {
    id: filingRow.id,
    label: "Review artifact filing",
    href: fixtureHref("review-artifact-filing"),
  },
];
const reviewsOf = (pending: readonly ApprovalRow[]): ApprovalReview[] =>
  reviews
    .filter((review) => pending.some((row) => row.id === review.id))
    .map(({ label, href }) => ({ label, href }));

const history = [closedRow];
const pending = [memoryRow, taskRow, filingRow];

/** 06.01 Approval center. */
export const approvals: ApprovalsView = {
  description:
    "Decisions assigned to you · Actions are rechecked before execution",
  draftHref: fixtureHref("draft-client-task"),
  pending,
  history,
  reviews: reviewsOf(pending),
};

/**
 * 06.01A–C: the decided proposal leaves Pending and its review link; it is
 * listed first in History with its recorded time and links to its recorded outcome.
 */
const afterDecision = (
  decided: ApprovalRow,
  time: string,
  outcomeHref: string,
): ApprovalsView => {
  const remaining = pending.filter((row) => row.id !== decided.id);
  return {
    ...approvals,
    description: `${remaining.length} pending proposals · ${decided.id} decision recorded · Actions rechecked before execution`,
    pending: remaining,
    history: [
      {
        ...decided,
        action: `${decided.action} · Decision recorded`,
        expires: time,
      },
      ...history,
    ],
    reviews: reviewsOf(remaining),
    recorded: { label: `${decided.id} · Decision recorded`, href: outcomeHref },
  };
};

/** 06.01A: TP-2048's recorded outcome is its action receipt (06.06). */
export const approvalsAfterTask = afterDecision(
  taskRow,
  "Today, 10:49 AM",
  fixtureHref("action-receipts"),
);

/** 06.01B: FL-1042's recorded outcome is the rejected filing (06.05A). */
export const approvalsAfterFiling = afterDecision(
  filingRow,
  "Today, 10:52 AM",
  fixtureHref("artifact-filing-rejected"),
);

/** 06.01C: MP-1042's recorded outcome is the approval by another reviewer (06.02C). */
export const approvalsAfterMemory = afterDecision(
  memoryRow,
  "Today, 10:47 AM",
  fixtureHref("memory-approved-by-reviewer"),
);
