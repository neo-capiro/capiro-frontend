// Client projection of the Workspace draft/document-agent state. Every value
// comes from the server-owned state returned by the Workspace service
// (`apps/workspace/src/document-agent`); nothing here re-implements the state
// machine or invents authority. Pure functions only, so the panels, the
// controller and the tests share one reading of the same state.
import type {
  AgentQualityCheck,
  AgentQualityEvaluation,
  AgentRunSummary,
  ContextConflict,
  DocumentAgentState,
  GenerationRunStatus,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";

export type ApprovalStage =
  | { status: "not_started" }
  | { status: "editable" }
  | { status: "awaiting_approval" }
  | { status: "blocked_conflicts"; conflicts: number }
  | { status: "approved"; approvedAt: string };

/**
 * Brief gate. The server approves by stamping `brief.approvedAt` and advances the
 * phase when the transition is legal, so the projection reads the stamped fact
 * plus whether there is anything to approve - not the phase, which is only a
 * side effect of approving.
 */
export function briefApproval(state: DocumentAgentState): ApprovalStage {
  if (state.brief.approvedAt)
    return { status: "approved", approvedAt: state.brief.approvedAt };
  return state.brief.objective
    ? { status: "awaiting_approval" }
    : { status: "editable" };
}

/** Context gate: unresolved conflicts block approval exactly as the server does. */
export function contextApproval(state: DocumentAgentState): ApprovalStage {
  if (state.contextPlan.approvedAt)
    return { status: "approved", approvedAt: state.contextPlan.approvedAt };
  const conflicts = openConflicts(state).length;
  if (conflicts > 0) return { status: "blocked_conflicts", conflicts };
  return state.contextPlan.includedItemIds.length > 0
    ? { status: "awaiting_approval" }
    : { status: "not_started" };
}

/** Outline gate: an outline with sections may be approved; an empty one may not. */
export function outlineApproval(state: DocumentAgentState): ApprovalStage {
  if (state.outline.approvedAt)
    return { status: "approved", approvedAt: state.outline.approvedAt };
  return state.outline.sections.length > 0
    ? { status: "awaiting_approval" }
    : { status: "not_started" };
}

export function openConflicts(state: DocumentAgentState): ContextConflict[] {
  return state.contextPlan.conflicts.filter((conflict) => !conflict.resolved);
}

export type UnitRetryPlan = {
  /** Units the server still has to produce; the only ones a retry may address. */
  retryable: string[];
  /** Units already produced; a retry must never discard or regenerate these. */
  preserved: string[];
};

function unitStates(
  run: AgentRunSummary | GenerationRunStatus,
): Record<string, string> {
  if ("sectionStates" in run) {
    const states: Record<string, string> = {};
    for (const [id, unit] of Object.entries(run.sectionStates))
      states[id] = unit.status;
    return states;
  }
  const results = run.sectionResults ?? {};
  const states: Record<string, string> = {};
  for (const [id, unit] of Object.entries(results)) states[id] = unit.status;
  return states;
}

/**
 * Split a run's units into retryable and already-produced. Cancellation and
 * retry both go through this: successful units are carried forward, never
 * re-requested, which is what keeps a partial run from losing finished work.
 */
export function unitRetryPlan(
  run: AgentRunSummary | GenerationRunStatus | undefined,
): UnitRetryPlan {
  if (!run) return { retryable: [], preserved: [] };
  const retryable: string[] = [];
  const preserved: string[] = [];
  for (const [id, status] of Object.entries(unitStates(run))) {
    if (status === "succeeded" || status === "done" || status === "complete")
      preserved.push(id);
    else retryable.push(id);
  }
  return { retryable: retryable.sort(), preserved: preserved.sort() };
}

export type RunProgress = {
  done: number;
  total: number;
  failed: string[];
  active?: string;
};

export function runStageProgress(
  run: AgentRunSummary | GenerationRunStatus | undefined,
): RunProgress {
  if (!run) return { done: 0, total: 0, failed: [] };
  const stages = run.stages;
  const done = stages.filter((stage) => stage.status === "done").length;
  const failed = stages
    .filter((stage) => stage.status === "failed")
    .map((stage) => stage.name);
  const active = stages.find((stage) => stage.status === "active")?.name;
  return active === undefined
    ? { done, total: stages.length, failed }
    : { done, total: stages.length, failed, active };
}

export function qualityFixableIssues(
  evaluation: AgentQualityEvaluation,
): AgentQualityCheck[] {
  return evaluation.checks.filter(
    (check) => check.fixable && check.status !== "success",
  );
}

export function qualityTone(
  evaluation: AgentQualityEvaluation,
): "success" | "warning" | "danger" {
  if (evaluation.readiness === "ready") return "success";
  if (evaluation.readiness === "ready_with_recommendations") return "warning";
  return "danger";
}
