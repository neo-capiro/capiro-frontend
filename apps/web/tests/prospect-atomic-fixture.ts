import type { WorkspaceDraftDocument } from "../src/shared/capiro/operations/workspace-documents";
import type { ProspectSaveBody } from "../src/shared/capiro/operations/workspace-prospect-save";
import { prospectRequestHash } from "../src/features/modules/workspace/prospects/atomic-save";
export function prospectStateFixture(
  draft: WorkspaceDraftDocument,
  stateHash = "a".repeat(64),
) {
  return {
    schemaVersion: 1,
    tenantId: draft.tenantId!,
    draftId: draft.id,
    prospectId: draft.prospectId!,
    clientId: null,
    stateHash,
    hashFormat: "workspace-prospect-draft-state-v1",
    draft,
  };
}
export async function prospectReceiptFixture(
  draft: WorkspaceDraftDocument,
  body: ProspectSaveBody,
  replayed = false,
) {
  return {
    schemaVersion: 1,
    replayed,
    receipt: {
      operation: "save_prospect_draft",
      tenantId: draft.tenantId!,
      draftId: draft.id,
      actorId: draft.ownerId,
      prospectId: draft.prospectId!,
      clientId: null,
      requestId: body.requestId,
      versionId: body.requestId,
      requestHash: await prospectRequestHash(
        {
          tenantId: draft.tenantId!,
          id: draft.id,
          prospectId: draft.prospectId!,
        },
        draft.ownerId,
        body,
      ),
      stateHash: "b".repeat(64),
      snapshotHash: "c".repeat(64),
      savedAt: "2026-10-29T12:00:00.000Z",
      hashFormat: "workspace-snapshot-canonical-json-v1",
    },
  };
}
