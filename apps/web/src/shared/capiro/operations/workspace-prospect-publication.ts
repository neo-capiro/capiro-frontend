import { z } from "zod";
import { defineOperation } from "../contracts";
const id = z.uuid(),
  hash = z.string().regex(/^[a-f0-9]{64}$/);
export const prospectPublicationBody = z.strictObject({
  requestId: id,
  expectedProspectId: id,
  sourceVersionId: id,
  sourceSnapshotHash: hash,
  expectedStateHash: hash,
  expectedPublicationId: id.nullable(),
});
export const prospectPublicationReceipt = z.strictObject({
  operation: z.literal("publish_prospect_draft"),
  tenantId: id,
  draftId: id,
  prospectId: id,
  requestId: id,
  requestHash: hash,
  actorId: z.string().min(1),
  sourceVersionId: id,
  sourceSnapshotHash: hash,
  sourceStateHash: hash,
  previousPublicationId: id.nullable(),
  versionId: id,
  publishedAt: z.iso.datetime(),
  snapshotHash: hash,
  hashFormat: z.literal("workspace-snapshot-canonical-json-v1"),
});
export const prospectPublicationState = z.strictObject({
  schemaVersion: z.literal(1),
  tenantId: id,
  draftId: id,
  prospectId: id,
  stateHash: hash,
  current: prospectPublicationReceipt.nullable(),
});
export const prospectPublicationResponse = z.strictObject({
  schemaVersion: z.literal(1),
  replayed: z.boolean(),
  receipt: prospectPublicationReceipt,
});
export type ProspectPublicationBody = z.infer<typeof prospectPublicationBody>;
export type ProspectPublicationState = z.infer<typeof prospectPublicationState>;
const source =
  "capiro-backend apps/workspace/src/versions/prospect-publication.controller.ts and prospect-publication.service.ts";
export const workspaceProspectPublicationOperations = {
  "workspace.prospect.publication": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/prospect-publication",
    request: z.strictObject({
      params: z.strictObject({ draftId: id }),
      query: z.strictObject({ prospectId: id }),
    }),
    response: prospectPublicationState,
    source,
  }),
  "workspace.prospect.publish": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/prospect-publication",
    request: z.strictObject({
      params: z.strictObject({ draftId: id }),
      body: prospectPublicationBody,
    }),
    response: prospectPublicationResponse,
    source,
  }),
};
