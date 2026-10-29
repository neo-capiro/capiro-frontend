import type { OperationDefinition } from "./contracts";

export const ordinarySaveConflictCodes = [
  "WORKSPACE_SAVE_STATE_CONFLICT",
  "WORKSPACE_SAVE_REQUEST_CONFLICT",
  "WORKSPACE_SAVE_CLIENT_CONFLICT",
] as const;
export type OrdinarySaveConflictCode =
  (typeof ordinarySaveConflictCodes)[number];
export function isOrdinarySaveOperation(operation: OperationDefinition) {
  return (
    operation.service === "workspace" &&
    operation.method === "POST" &&
    ["/drafts/:id/save", "/drafts/:id/prospect-save"].includes(operation.path)
  );
}
/** Only the reviewed producer's exact save409codes cross the existing gateway. */
export function ordinarySaveConflictCode(
  operation: OperationDefinition,
  status: number,
  payload: unknown,
) {
  if (
    status !== 409 ||
    !isOrdinarySaveOperation(operation) ||
    !payload ||
    typeof payload !== "object" ||
    !Object.hasOwn(payload, "code")
  )
    return undefined;
  return ordinarySaveConflictCodes.find(
    (code) => code === Reflect.get(payload, "code"),
  );
}
