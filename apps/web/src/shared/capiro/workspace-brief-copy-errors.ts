import type { OperationDefinition } from "./contracts";
import { workspaceBriefCopyOperations } from "./operations/workspace-brief-copy";

export const workspaceBriefConflictCodes = [
  "WORKSPACE_BRIEF_STATE_CONFLICT",
  "WORKSPACE_BRIEF_REQUEST_CONFLICT",
  "WORKSPACE_BRIEF_COPY_CONSUMED",
  "WORKSPACE_BRIEF_COPY_LIMIT",
  "WORKSPACE_BRIEF_ATOMIC_SAVE_REQUIRED",
] as const;
export type WorkspaceBriefConflictCode =
  (typeof workspaceBriefConflictCodes)[number];

export function isWorkspaceBriefOperation(operation: OperationDefinition) {
  return Object.values(workspaceBriefCopyOperations).some(
    (allowed) =>
      operation.service === allowed.service &&
      operation.method === allowed.method &&
      operation.path === allowed.path,
  );
}

/** Preserve only reviewed codes; messages never establish command disposition. */
export function workspaceBriefConflictCode(
  operation: OperationDefinition,
  status: number,
  payload: unknown,
): WorkspaceBriefConflictCode | undefined {
  if (
    status !== 409 ||
    !isWorkspaceBriefOperation(operation) ||
    !payload ||
    typeof payload !== "object" ||
    !Object.hasOwn(payload, "code")
  )
    return undefined;
  const code = (payload as { code: unknown }).code;
  return workspaceBriefConflictCodes.find((allowed) => allowed === code);
}
