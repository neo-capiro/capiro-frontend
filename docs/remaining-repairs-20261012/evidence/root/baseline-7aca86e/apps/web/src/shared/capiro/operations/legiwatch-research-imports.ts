import { z } from "zod";
import { defineOperation } from "../contracts";
import { capturedImportJson } from "./legiwatch-imports";
import {
  monitorId,
  monitorVersion,
  statuteRule,
} from "./legiwatch-monitor-schemas";
import { researchScope } from "./legiwatch-research-schemas";
const source =
  "apps/intel-api/src/tracker/research/research.controller.ts; research.service.ts; research-import.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const stagedLegalSource = z.object({
  id: z.string(),
  sourceId: z.string(),
  version: monitorVersion,
  sourceHash: z.string(),
  state: z.string(),
  payload: capturedImportJson,
});
const capturedVersion = {
  stagedId: monitorId,
  expectedVersion: monitorVersion,
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
};
const outcome = z.object({
  stagedId: z.string(),
  sourceId: z.string(),
  sourceVersion: z.number(),
  sourceHash: z.string(),
  status: z.string(),
  reason: z.string(),
  edition: z.string().nullable(),
  targetFolderId: z.string().nullable(),
  targetVersion: z.number().nullable(),
  referenceId: z.string().nullable(),
});
export const legalImportDecision = researchScope
  .extend({
    ...capturedVersion,
    requestKey: z.string().uuid(),
    status: z.enum(["imported", "unresolved", "excluded"]),
    reason: z.string().trim().min(3).max(2000),
    edition: z
      .string()
      .regex(/^20\d{2}$/)
      .optional(),
    referenceId: monitorId.optional(),
    revisionId: monitorId.optional(),
    resolutionBasis: z.string().min(8).max(2000).optional(),
    expectedMembershipVersion: monitorVersion.optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.status !== "imported" ||
      Boolean(
        body.folderId &&
        body.edition &&
        body.referenceId &&
        body.revisionId &&
        body.resolutionBasis &&
        body.expectedMembershipVersion !== undefined,
      ),
    "Resolve the exact edition, revision and current folder membership before importing.",
  );
export const legiwatchResearchImportOperations = {
  "legiwatch.research.imports": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/imports",
    request: z
      .object({
        query: researchScope
          .extend({ sourceAccount: z.string().min(3).max(120) })
          .strict(),
      })
      .strict(),
    response: z.object({
      decisions: z.array(
        z.object({ staged_id: z.string(), outcome, created_at: z.string() }),
      ),
      memberships: z.array(
        stagedLegalSource.extend({ targetFolderId: z.string().nullable() }),
      ),
      rules: z.array(
        stagedLegalSource.extend({
          interpretedName: z.string().nullable(),
          cadence: z.null(),
          matchActive: z.literal(false),
          deliveryActive: z.literal(false),
        }),
      ),
      message: z.string(),
    }),
    source,
  }),
  "legiwatch.research.import.promote": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/imports/promote",
    request: z
      .object({ body: researchScope.extend(capturedVersion).strict() })
      .strict(),
    response: z.array(statuteRule),
    source,
  }),
  "legiwatch.research.import.decide": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/imports/decide",
    request: z.object({ body: legalImportDecision }).strict(),
    response: outcome,
    source,
  }),
  "legiwatch.research.import.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/imports/preview",
    request: z
      .object({
        body: researchScope
          .extend({ stagedId: monitorId, descendants: z.boolean() })
          .strict(),
      })
      .strict(),
    response: z.object({
      stagedId: z.string(),
      sourceHash: z.string(),
      sourceVersion: z.number(),
      previewHash: z.string(),
      name: z.string().nullable(),
      targets: z.array(
        z.object({
          folderId: z.string(),
          sourceFolderId: z.string(),
          version: z.number(),
        }),
      ),
      gaps: z.array(
        z.object({ sourceFolderId: z.string().optional(), reason: z.string() }),
      ),
      matches: z.array(
        z.object({
          id: z.string(),
          bill_id: z.string(),
          document_id: z.string(),
          document_revision: z.string(),
          quote: z.string(),
          relation: z.string(),
        }),
      ),
      coverage: z.object({ complete: z.literal(false), reason: z.string() }),
      matchActive: z.literal(false),
      deliveryActive: z.literal(false),
      recipientsState: z.string(),
      baselinePolicy: z.string(),
    }),
    source,
  }),
} as const;
