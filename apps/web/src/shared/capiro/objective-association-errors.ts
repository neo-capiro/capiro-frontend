import type { OperationDefinition } from "./contracts";
import {
  objectiveOperationalOperations,
  operationalFailureSchema,
} from "./operations/objective-operational";

export function isObjectiveAssociationOperation(
  operation: OperationDefinition,
) {
  return [
    objectiveOperationalOperations["objectives.operational.link"],
    objectiveOperationalOperations["objectives.operational.receipt"],
  ].some(
    (allowed) =>
      operation.service === allowed.service &&
      operation.method === allowed.method &&
      operation.path === allowed.path,
  );
}

/** Only the pinned native failure contract crosses this boundary. */
export function objectiveAssociationFailure(
  operation: OperationDefinition,
  status: number,
  payload: unknown,
) {
  if (!isObjectiveAssociationOperation(operation)) return;
  const parsed = operationalFailureSchema.safeParse(payload);
  if (!parsed.success || parsed.data.status !== status) return;
  return parsed.data;
}
