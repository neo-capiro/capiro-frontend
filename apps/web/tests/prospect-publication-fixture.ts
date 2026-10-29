import {
  draft,
  actor,
  prospectId,
  otherId,
} from "./prospect-resources-fixtures";
import { workspaceSnapshotHash } from "../src/shared/capiro/workspace-snapshot";
import type { ProspectPublicationBody } from "../src/shared/capiro/operations/workspace-prospect-publication";
export const publicationDraft = {
  ...draft,
  config: {
    sections: ["Body"],
    sectionContent: { Body: "Reviewed saved content." },
  },
};
export const publicationScope = {
  tenantId: actor.tenantId,
  id: draft.id,
  prospectId,
};
export const publicationVersion = {
  id: otherId,
  draftId: draft.id,
  label: "Manual save",
  authorId: draft.ownerId,
  authorKind: "person",
  createdAt: "2026-10-29T12:00:00.000Z",
  snapshot: {
    docTitle: draft.docTitle,
    config: publicationDraft.config,
    prospectId,
    clientId: null,
    documents: publicationDraft.documents,
    atomicSave: { operation: "save_prospect_draft", stateHash: "a".repeat(64) },
  },
};
export const publicationStateFixture = {
  schemaVersion: 1 as const,
  tenantId: actor.tenantId,
  draftId: draft.id,
  prospectId,
  stateHash: "a".repeat(64),
  current: null,
};
export async function publicationReceiptFixture(
  input: ProspectPublicationBody,
  replayed = false,
) {
  return {
    schemaVersion: 1 as const,
    replayed,
    receipt: {
      operation: "publish_prospect_draft" as const,
      tenantId: actor.tenantId,
      draftId: draft.id,
      prospectId,
      actorId: draft.ownerId,
      requestId: input.requestId,
      versionId: input.requestId,
      requestHash: await workspaceSnapshotHash({
        operation: "publish_prospect_draft",
        tenantId: actor.tenantId,
        draftId: draft.id,
        actorId: draft.ownerId,
        input,
      }),
      sourceVersionId: input.sourceVersionId,
      sourceSnapshotHash: input.sourceSnapshotHash,
      sourceStateHash: input.expectedStateHash,
      previousPublicationId: input.expectedPublicationId,
      publishedAt: "2026-10-29T12:01:00.000Z",
      snapshotHash: "b".repeat(64),
      hashFormat: "workspace-snapshot-canonical-json-v1" as const,
    },
  };
}
