import { z } from "zod";
import {
  canonicalWorkspaceSnapshot,
  workspaceSnapshotHash,
} from "@/shared/capiro/workspace-snapshot";
import {
  prospectAtomicState,
  prospectSaveBody,
  prospectSaveResponse,
  type ProspectSaveBody,
} from "@/shared/capiro/operations/workspace-prospect-save";
import { assertProspectDraft, type ProspectDraftScope } from "./manual-draft";
export const prospectSaveRecovery = z.strictObject({
  requestId: z.uuid(),
  baseline: z.string(),
  input: z.strictObject({
    title: z.string().min(1).max(500),
    names: z.array(z.string()).max(100),
    sections: z.record(z.string(), z.string()),
  }),
  atomicVersion: z.literal(1).optional(),
  conflict: z.literal(true).optional(),
});
export type ProspectSaveRecovery = z.infer<typeof prospectSaveRecovery>;
export const prospectSaveRecoveryContract = {
  schema: prospectSaveRecovery,
  requestId: (record: ProspectSaveRecovery) => record.requestId,
  validateUpdate(previous: ProspectSaveRecovery, next: ProspectSaveRecovery) {
    const { conflict: before, ...original } = previous;
    const { conflict: after, ...updated } = next;
    if (
      canonicalWorkspaceSnapshot(original) !==
        canonicalWorkspaceSnapshot(updated) ||
      (before && !after)
    )
      throw new Error(
        "A retained prospect save cannot change its request or content.",
      );
  },
};
export function bindProspectState(value: unknown, scope: ProspectDraftScope) {
  const state = prospectAtomicState.parse(value);
  assertProspectDraft(state.draft, scope);
  if (
    state.tenantId !== scope.tenantId ||
    state.draftId !== scope.id ||
    state.prospectId !== scope.prospectId
  )
    throw new Error(
      "The current state does not match this prospect and document.",
    );
  return state;
}
export function prospectRequest(
  record: ProspectSaveRecovery,
  prospectId: string,
) {
  if (record.atomicVersion !== 1)
    throw new Error(
      "Review the current document before saving legacy edits as a new version.",
    );
  return prospectSaveBody.parse({
    requestId: record.requestId,
    expectedProspectId: prospectId,
    expectedStateHash: record.baseline,
    ...record.input,
  });
}
export function prospectRequestHash(
  scope: ProspectDraftScope,
  actorId: string,
  body: ProspectSaveBody,
) {
  return workspaceSnapshotHash({
    operation: "save_prospect_draft",
    tenantId: scope.tenantId,
    draftId: scope.id,
    actorId,
    prospectId: scope.prospectId,
    input: {
      requestId: body.requestId,
      expectedStateHash: body.expectedStateHash,
      expectedClientId: null,
      label: "Manual save",
      draft: {
        docTitle: body.title,
        config: { sections: body.names, sectionContent: body.sections },
      },
    },
  });
}
export async function bindProspectSave(
  value: unknown,
  scope: ProspectDraftScope,
  actorId: string,
  body: ProspectSaveBody,
) {
  const result = prospectSaveResponse.parse(value),
    receipt = result.receipt;
  if (
    receipt.tenantId !== scope.tenantId ||
    receipt.draftId !== scope.id ||
    receipt.prospectId !== scope.prospectId ||
    receipt.actorId !== actorId ||
    receipt.requestId !== body.requestId ||
    receipt.versionId !== body.requestId ||
    receipt.requestHash !== (await prospectRequestHash(scope, actorId, body))
  )
    throw new Error(
      "The save receipt does not match this exact prospect edit. Recover the original request.",
    );
  return result;
}
