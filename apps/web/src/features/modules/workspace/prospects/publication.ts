import type { SavedVersion } from "@/shared/capiro/operations/workspace-documents";
import {
  prospectPublicationBody,
  prospectPublicationResponse,
  prospectPublicationState,
  type ProspectPublicationBody,
} from "@/shared/capiro/operations/workspace-prospect-publication";
import {
  canonicalWorkspaceSnapshot,
  workspaceSnapshotHash,
} from "@/shared/capiro/workspace-snapshot";
import type { ProspectDraftScope } from "./manual-draft";

export const publicationRecoveryContract = {
  schema: prospectPublicationBody,
  requestId: (body: ProspectPublicationBody) => body.requestId,
  validateUpdate(
    previous: ProspectPublicationBody,
    next: ProspectPublicationBody,
  ) {
    if (
      canonicalWorkspaceSnapshot(previous) !== canonicalWorkspaceSnapshot(next)
    )
      throw new Error(
        "A retained publication cannot change its saved revision or request.",
      );
  },
};
export function bindPublicationState(
  value: unknown,
  scope: ProspectDraftScope,
) {
  const state = prospectPublicationState.parse(value);
  if (
    state.tenantId !== scope.tenantId ||
    state.draftId !== scope.id ||
    state.prospectId !== scope.prospectId ||
    (state.current &&
      (state.current.tenantId !== scope.tenantId ||
        state.current.draftId !== scope.id ||
        state.current.prospectId !== scope.prospectId))
  )
    throw new Error(
      "Publication state belongs to a different prospect or document.",
    );
  return state;
}
export function publicationSourceEligible(
  version: SavedVersion,
  stateHash?: string,
) {
  const snapshot = version.snapshot;
  const atomic = snapshot?.atomicSave as
    | { operation?: string; stateHash?: string }
    | undefined;
  return Boolean(
    snapshot &&
    !snapshot.prospectPublication &&
    atomic?.operation === "save_prospect_draft" &&
    stateHash &&
    atomic.stateHash === stateHash,
  );
}
export async function bindPublication(
  value: unknown,
  scope: ProspectDraftScope,
  actorId: string,
  input: ProspectPublicationBody,
) {
  const result = prospectPublicationResponse.parse(value),
    r = result.receipt;
  const requestHash = await workspaceSnapshotHash({
    operation: "publish_prospect_draft",
    tenantId: scope.tenantId,
    draftId: scope.id,
    actorId,
    input,
  });
  if (
    r.tenantId !== scope.tenantId ||
    r.draftId !== scope.id ||
    r.prospectId !== scope.prospectId ||
    r.actorId !== actorId ||
    r.requestId !== input.requestId ||
    r.versionId !== input.requestId ||
    r.requestHash !== requestHash ||
    r.sourceVersionId !== input.sourceVersionId ||
    r.sourceSnapshotHash !== input.sourceSnapshotHash ||
    r.sourceStateHash !== input.expectedStateHash ||
    r.previousPublicationId !== input.expectedPublicationId
  )
    throw new Error(
      "Publication is not confirmed for this exact saved revision. Recover the original request.",
    );
  return result;
}
