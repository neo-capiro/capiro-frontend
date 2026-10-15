/**
 * Figma 3.4 sidebar sample count: three proposals are pending until one is
 * decided; decision-outcome frames show the two that remain.
 */
const afterDecision: ReadonlySet<string> = new Set([
  "approvals-after-task-decision",
  "approvals-after-filing-decision",
  "approvals-after-memory-decision",
  "action-receipts",
  "executed-task-proposal",
  "artifact-filing-rejected",
  "filing-changes-requested",
  "task-proposal-rejected",
  "task-changes-requested",
  "memory-approved",
  "memory-current-approved",
  "memory-superseded",
  "memory-proposal-rejected",
  "memory-proposal-changes-requested",
]);

export const pendingApprovals = (slug?: string) =>
  slug !== undefined && afterDecision.has(slug) ? 2 : 3;
