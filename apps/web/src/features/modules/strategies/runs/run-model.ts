import type { StrategyRun } from "../../../../shared/capiro/operations/strategies-agents";

export type RunGroup = "ready" | "working" | "attention" | "completed";
export const runGroups: {
  id: RunGroup;
  label: string;
  states: StrategyRun["state"][];
}[] = [
  {
    id: "ready",
    label: "Ready to execute",
    states: ["ready_for_review", "approved"],
  },
  {
    id: "working",
    label: "In progress",
    states: ["queued", "planning", "executing"],
  },
  {
    id: "attention",
    label: "Needs attention",
    states: [
      "waiting_for_input",
      "failed",
      "failed_recoverable",
      "failed_terminal",
    ],
  },
  { id: "completed", label: "Completed", states: ["completed"] },
];
export function runTitle(run: StrategyRun) {
  const task = run.findings?.tasks?.find(
    (task) => task.detail?.title || task.detail?.label,
  );
  return (
    task?.detail?.title || task?.detail?.label || `Run ${run.id.slice(0, 8)}`
  );
}
export function stateLabel(state: string) {
  const labels: Partial<Record<StrategyRun["state"], string>> = {
    ready_for_review: "Ready to execute",
    waiting_for_input: "Blocked",
    failed_recoverable: "Failed · recoverable",
    failed_terminal: "Failed · terminal",
  };
  return (
    labels[state as StrategyRun["state"]] ??
    state.replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase())
  );
}
export function runTone(
  state: StrategyRun["state"],
): "neutral" | "success" | "warning" | "danger" {
  if (state.startsWith("failed")) return "danger";
  if (state === "waiting_for_input") return "warning";
  if (["ready_for_review", "approved", "staged", "completed"].includes(state))
    return "success";
  return "neutral";
}
export function destination(taskType: string) {
  return taskType === "workspace_draft"
    ? "Workspace"
    : taskType === "outreach_record" || taskType === "await_send_approval"
      ? "Outreach"
      : "Not specified";
}
export const taskLabel = (type: string) =>
  ({
    workspace_draft: "Prepare document draft",
    outreach_record: "Prepare outreach record",
    await_send_approval: "Review outreach",
  })[type] ?? stateLabel(type);
export const timestamp = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "Not recorded";
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Only the server's current policy grants controls; an unknown action stays unavailable. */
export const policyAllows = (actions: readonly string[], action: string) =>
  actions.includes(action);
