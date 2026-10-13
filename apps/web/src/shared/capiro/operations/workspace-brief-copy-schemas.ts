import { z } from "zod";
import {
  briefCopyBodySchema,
  briefCopyEvidenceJsonSchema,
} from "./workspace-brief-copy-body";

export const briefCopyIdSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
const hash = z.string().regex(/^[0-9a-f]{64}$/);
export const briefCopySourceSchema = z
  .object({
    kind: z.literal("core_prospect_brief_version"),
    prospectId: briefCopyIdSchema,
    briefId: briefCopyIdSchema,
    versionId: briefCopyIdSchema,
    versionNumber: z.number().int().min(1).max(100),
    sectionsHash: hash,
    snapshotHash: hash,
  })
  .strict();
const command = z.object({
  requestId: briefCopyIdSchema,
  expectedStateHash: hash,
  expectedClientId: briefCopyIdSchema.nullable(),
});
export const briefCopyCreateBodySchema = command
  .extend({ source: briefCopySourceSchema })
  .strict();
export const briefCopySaveBodySchema = command
  .extend({
    body: briefCopyBodySchema,
    name: z.string().min(1).max(300).optional(),
    ordinal: z.number().int().min(0).max(100_000).optional(),
    docTitle: z.string().min(1).max(500).optional(),
    label: z.string().max(300).optional(),
  })
  .strict();
const state = z.object({
  schemaVersion: z.literal(1),
  tenantId: briefCopyIdSchema,
  draftId: briefCopyIdSchema,
  prospectId: briefCopyIdSchema,
  clientId: briefCopyIdSchema.nullable(),
  stateHash: hash,
  hashFormat: z.literal("workspace-prospect-draft-state-v1"),
});
export const briefCopyStateSchema = state
  .extend({
    documents: z.array(
      z.object({
        id: briefCopyIdSchema,
        name: z.string(),
        sourceBriefVersion: briefCopySourceSchema.nullable(),
      }),
    ),
  })
  .refine(
    ({ documents, prospectId }) =>
      new Set(documents.map(({ id }) => id)).size === documents.length &&
      documents.every(
        ({ sourceBriefVersion }) =>
          !sourceBriefVersion || sourceBriefVersion.prospectId === prospectId,
      ),
    "Document identities must match the current prospect draft.",
  );
export const briefCopyDetailSchema = state
  .extend({
    document: z.object({
      id: briefCopyIdSchema,
      name: z.string(),
      ordinal: z.number().int(),
      body: briefCopyBodySchema,
      sourceBriefVersion: briefCopySourceSchema,
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
    sourceEvidence: z.object({
      sections: briefCopyEvidenceJsonSchema,
      citations: z.array(briefCopyEvidenceJsonSchema),
      sourceSnapshot: briefCopyEvidenceJsonSchema,
    }),
  })
  .refine(
    ({ document, prospectId }) =>
      document.sourceBriefVersion.prospectId === prospectId,
    "The copied document must match the current prospect.",
  );
export const briefCopyResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    replayed: z.boolean(),
    receipt: z.object({
      tenantId: briefCopyIdSchema,
      draftId: briefCopyIdSchema,
      prospectId: briefCopyIdSchema,
      operation: z.enum(["copy_core_brief", "save_brief_copy"]),
      requestId: briefCopyIdSchema,
      requestHash: hash,
      actorId: z.string().min(1).max(200),
      documentId: briefCopyIdSchema,
      clientId: briefCopyIdSchema.nullable(),
      source: briefCopySourceSchema,
      stateHash: hash,
      versionId: briefCopyIdSchema,
      snapshotHash: hash,
      hashFormat: z.literal("workspace-snapshot-canonical-json-v1"),
    }),
  })
  .refine(
    ({ receipt }) =>
      receipt.versionId === receipt.requestId &&
      receipt.source.prospectId === receipt.prospectId,
    "The saved version and source must match the receipt.",
  );
export type BriefCopySource = z.infer<typeof briefCopySourceSchema>;
export type BriefCopyState = z.infer<typeof briefCopyStateSchema>;
export type BriefCopyDetail = z.infer<typeof briefCopyDetailSchema>;
export type BriefCopyResult = z.infer<typeof briefCopyResultSchema>;
export type BriefCopyCreateBody = z.infer<typeof briefCopyCreateBodySchema>;
export type BriefCopySaveBody = z.infer<typeof briefCopySaveBodySchema>;
