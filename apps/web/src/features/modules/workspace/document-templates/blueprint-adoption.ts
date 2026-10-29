import type { WorkspaceBlueprintVersionMetadata } from "@capiro/shared/workspace-template-studio";
import type { WorkspaceDraftDocument } from "../../../../shared/capiro/operations/workspace-documents";
import { workspaceBlueprintPin } from "../../../../shared/capiro/operations/workspace-documents";

export function sameBlueprintPin(actual: unknown, expected: unknown) {
  if (actual === undefined && expected === undefined) return true;
  const left = workspaceBlueprintPin.safeParse(actual),
    right = workspaceBlueprintPin.safeParse(expected);
  return (
    left.success &&
    right.success &&
    left.data.blueprintId === right.data.blueprintId &&
    left.data.versionId === right.data.versionId &&
    left.data.version === right.data.version &&
    left.data.definitionHash === right.data.definitionHash
  );
}

export function blueprintPin(version: WorkspaceBlueprintVersionMetadata) {
  return {
    blueprintId: version.blueprintId,
    versionId: version.id,
    version: version.version,
    definitionHash: version.definitionHash,
  };
}
export function samePublishedVersion(
  expected: WorkspaceBlueprintVersionMetadata,
  current: WorkspaceBlueprintVersionMetadata,
) {
  return (
    current.status === "published" &&
    expected.status === "published" &&
    current.blueprintId === expected.blueprintId &&
    current.id === expected.id &&
    current.version === expected.version &&
    current.definitionHash === expected.definitionHash
  );
}
/** Confirm the ordinary aggregate's saved tuple, never an inferred latest pin. */
export function adoptedBlueprint(
  draft: WorkspaceDraftDocument,
  version: WorkspaceBlueprintVersionMetadata,
  clientId: string | null,
) {
  const pin = draft.config.documentAgent?.blueprintPin;
  return (
    !draft.prospectId &&
    (draft.clientId ?? null) === clientId &&
    (draft.config.clientId ?? null) === clientId &&
    sameBlueprintPin(pin, blueprintPin(version))
  );
}
