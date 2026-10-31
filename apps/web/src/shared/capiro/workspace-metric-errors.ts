import type { OperationDefinition } from "./contracts";

export const WORKSPACE_METRIC_INCOMPLETE = "WORKSPACE_SAVED_WORK_INCOMPLETE";
export function isWorkspaceMetric(operation: OperationDefinition) {
  return (
    operation.service === "workspace" &&
    operation.method === "GET" &&
    operation.path === "/drafts/saved-work-count"
  );
}
export function workspaceMetricRefusal(payload: unknown) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    !("code" in payload) ||
    payload.code !== WORKSPACE_METRIC_INCOMPLETE
  )
    return null;
  return {
    message: "The saved work observation is incomplete.",
    error: { code: WORKSPACE_METRIC_INCOMPLETE },
  };
}
