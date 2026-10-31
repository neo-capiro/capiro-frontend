import { z } from "zod";
import {
  monitorId,
  monitorVersion,
  staffRecipient,
} from "./legiwatch-monitor-schemas";
import { folderBillSchema } from "./legiwatch-folder-schemas";
export const keywordScope = z
  .object({
    jurisdiction: z.string().regex(/^[A-Z]{2}$/),
    sessionKey: z.string().min(1).max(60),
    fields: z
      .array(z.enum(["title", "bill_text", "amendment_text"]))
      .min(1)
      .max(3),
  })
  .strict();
export const keywordConfig = z
  .object({
    scope: keywordScope,
    folderIds: z.array(monitorId).max(20),
    definitions: z
      .array(
        z
          .object({ id: z.string().min(1).max(200), raw: z.string().max(4096) })
          .strict(),
      )
      .max(190),
    aggregation: z.enum(["any-v1", "all-v1", "unqualified"]),
    semanticsReviewed: z.boolean(),
    mode: z.enum(["suggest", "auto_add"]),
    cadence: z.enum(["realtime", "end_of_day"]),
    timezone: z.string().max(100).nullable(),
    localMinutes: z.number().int().min(0).max(1439).nullable(),
  })
  .strict();
export const keywordCompilation = z.object({
  raw: z.string(),
  parserVersion: z.string(),
  status: z.enum(["supported", "unsupported", "empty"]),
  reasons: z.array(z.string()),
  interpretation: z.string().nullable(),
});
export const keywordRule = z.object({
  id: z.string(),
  name: z.string(),
  version: monitorVersion,
  state: z.string(),
  config: keywordConfig.strip().extend({
    source: z
      .object({
        stagedId: z.string().optional(),
        sourceAccount: z.string().optional(),
        sourceId: z.string().optional(),
        sourceVersion: z.number().optional(),
        sourceHash: z.string().optional(),
        ownerMapping: z.string().optional(),
        recipientMapping: z.string().optional(),
      })
      .nullable()
      .optional(),
    recipients: z.array(staffRecipient.strip()).optional(),
    deliveryEnabled: z.boolean().optional(),
  }),
  issues: z.array(z.string()).optional(),
  compiled: z
    .array(z.object({ id: z.string(), compiled: keywordCompilation }))
    .optional(),
});
export const keywordBody = z
  .object({ name: z.string().trim().min(1).max(200), config: keywordConfig })
  .strict();
export const keywordScan = z.object({
  id: z.string(),
  rule_id: z.string(),
  rule_version: z.number(),
  state: z.string(),
  cursor: z.string().nullable(),
  counts: z.object({
    evaluated: z.number(),
    matched: z.number(),
    incomplete: z.number(),
    suggestions: z.number(),
  }),
  source_boundary: z.string(),
  reason: z.string().nullable(),
  attempts: z.number(),
  input: z.object({ mode: z.enum(["preview", "active"]) }),
});
export const keywordSuggestion = z.object({
  id: z.string(),
  folder_id: z.string(),
  bill_id: z.string(),
  version: z.number(),
  state: z.string(),
  payload: z.object({
    bill: folderBillSchema,
    coverage: z.object({
      complete: z.boolean(),
      inspectedDocuments: z.number(),
      missing: z.array(z.string()),
    }),
    explanation: z.string().optional(),
    origin: z.enum(["deterministic", "semantic"]),
  }),
});
const queryEvidence = z.object({
  start: z.number(),
  end: z.number(),
  quote: z.string(),
  expression: z.string(),
});
export const keywordPreview = z.object({
  compiled: keywordCompilation,
  boundary: z.string(),
  next: z.string().nullable(),
  scanned: z.number(),
  rows: z.array(
    z.object({
      bill: folderBillSchema,
      coverage: z.object({
        complete: z.boolean(),
        inspectedDocuments: z.number(),
        missing: z.array(z.string()),
      }),
      documents: z.array(
        z.object({
          id: z.string(),
          kind: z.string(),
          revision: z.string(),
          sourceUrl: z.string().nullable(),
          complete: z.boolean(),
          reason: z.string().nullable(),
          evaluation: z.object({
            outcome: z.enum(["match", "no_match", "not_fully_evaluated"]),
            qualified: z.boolean(),
            results: z.array(
              z.object({
                id: z.string(),
                outcome: z.string(),
                complete: z.boolean(),
                evidence: z.array(queryEvidence),
              }),
            ),
          }),
        }),
      ),
    }),
  ),
});
