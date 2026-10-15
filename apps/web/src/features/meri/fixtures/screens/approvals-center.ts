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

type ReviewLinks = {
  memory?: string | undefined;
  task?: string | undefined;
  filing?: string | undefined;
};
const reviews = (links: ReviewLinks): readonly ApprovalReview[] => [
  { label: "Review memory update", href: links.memory },
  { label: "Review task", href: links.task },
  { label: "Review artifact filing", href: links.filing },
];
const pendingReviews: ReviewLinks = {
  memory: fixtureHref("memory-approval-review"),
  task: fixtureHref("review-task-action"),
  filing: fixtureHref("review-artifact-filing"),
};

/** The decided proposal leaves Pending and is listed first in History with its recorded time. */
const decided = (row: ApprovalRow, time: string): ApprovalRow => ({
  ...row,
  action: `${row.action} · Decision recorded`,
  expires: time,
});

const center = (
  description: string,
  pending: readonly ApprovalRow[],
  history: readonly ApprovalRow[],
  links: ReviewLinks,
): ApprovalsView => ({
  description,
  draftHref: fixtureHref("draft-client-task"),
  pending,
  history,
  reviews: reviews(links),
});

const afterDecision = (id: string) =>
  `2 pending proposals · ${id} decision recorded · Actions rechecked before execution`;

/** 06.01 Approval center. */
export const approvals = center(
  "Decisions assigned to you · Actions are rechecked before execution",
  [memoryRow, taskRow, filingRow],
  [closedRow],
  pendingReviews,
);

/** 06.01A: TP-2048 decided; its review opens the recorded task outcome. */
export const approvalsAfterTask = center(
  afterDecision("TP-2048"),
  [memoryRow, filingRow],
  [decided(taskRow, "Today, 10:49 AM"), closedRow],
  { ...pendingReviews, task: fixtureHref("executed-task-proposal") },
);

/** 06.01B: FL-1042 decided; its review opens the recorded filing outcome. */
export const approvalsAfterFiling = center(
  afterDecision("FL-1042"),
  [memoryRow, taskRow],
  [decided(filingRow, "Today, 10:52 AM"), closedRow],
  { ...pendingReviews, filing: fixtureHref("artifact-filing-rejected") },
);

/** 06.01C: MP-1042 decided; no recorded memory-decision frame exists, so its review is unavailable. */
export const approvalsAfterMemory = center(
  afterDecision("MP-1042"),
  [taskRow, filingRow],
  [decided(memoryRow, "Today, 10:47 AM"), closedRow],
  { ...pendingReviews, memory: undefined },
);
