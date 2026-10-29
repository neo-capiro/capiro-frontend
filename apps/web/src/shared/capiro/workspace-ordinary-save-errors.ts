import type { OperationDefinition } from "./contracts";

export const ordinarySaveConflictCodes = [
  "WORKSPACE_SAVE_STATE_CONFLICT",
  "WORKSPACE_SAVE_REQUEST_CONFLICT",
  "WORKSPACE_SAVE_CLIENT_CONFLICT",
] as const;
export const publicationConflictCodes = [
  "WORKSPACE_PUBLICATION_RECEIPT_CONFLICT",
  "WORKSPACE_PUBLICATION_ORIGIN_CONFLICT",
  "WORKSPACE_PUBLICATION_REQUEST_CONFLICT",
  "WORKSPACE_PUBLICATION_CURRENT_CONFLICT",
  "WORKSPACE_PUBLICATION_STATE_CONFLICT",
  "WORKSPACE_PUBLICATION_SOURCE_CONFLICT",
] as const;
export const generationConflictCodes = [
  "WORKSPACE_GENERATION_REQUEST_CONFLICT",
  "WORKSPACE_GENERATION_STATE_CONFLICT",
  "WORKSPACE_GENERATION_SOURCE_CONFLICT",
  "WORKSPACE_GENERATION_RECEIPT_CONFLICT",
  "WORKSPACE_GENERATION_ACTOR_CONFLICT",
  "WORKSPACE_GENERATION_OUTPUT_CONFLICT",
  "WORKSPACE_GENERATION_DECISION_CONFLICT",
  ...ordinarySaveConflictCodes,
] as const;
export function isProspectGeneration(operation: OperationDefinition) {
  return (
    operation.service === "workspace" &&
    operation.method === "POST" &&
    [
      "/drafts/:draftId/prospect-generation",
      "/drafts/:draftId/prospect-generation/:proposalId/reconcile",
      "/drafts/:draftId/prospect-generation/:proposalId/retry",
      "/drafts/:draftId/prospect-generation/:proposalId/decision",
    ].includes(operation.path)
  );
}
export type GenerationConflictCode = (typeof generationConflictCodes)[number];
export type PublicationConflictCode = (typeof publicationConflictCodes)[number];
export function isProspectPublication(operation: OperationDefinition) {
  return (
    operation.service === "workspace" &&
    operation.method === "POST" &&
    operation.path === "/drafts/:draftId/prospect-publication"
  );
}
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
    !(
      isOrdinarySaveOperation(operation) ||
      isProspectPublication(operation) ||
      isProspectGeneration(operation)
    ) ||
    !payload ||
    typeof payload !== "object" ||
    !Object.hasOwn(payload, "code")
  )
    return undefined;
  return (
    isOrdinarySaveOperation(operation)
      ? ordinarySaveConflictCodes
      : isProspectGeneration(operation)
        ? generationConflictCodes
        : publicationConflictCodes
  ).find((code) => code === Reflect.get(payload, "code"));
}
