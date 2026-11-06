import { z } from "zod";
import type {
  LegiWatchImpactAnalysis,
  LegiWatchImpactDetail,
  LegiWatchTrackerPage,
  LegiWatchTrackerRow,
} from "@capiro/legiwatch-contracts";

const direction = z.enum(["positive", "negative", "mixed", "uncertain"]);
const confidence = z.enum(["high", "medium", "low"]);
const sourceUrl = z
  .string()
  .url()
  .refine((url) => /^https?:\/\//i.test(url));
const citation = z.object({
  sourceId: z.string().min(1),
  sourceUrl: sourceUrl.nullable(),
  label: z.string(),
  quote: z.string(),
  locator: z.string(),
  revision: z.string(),
});
export const impactSchema: z.ZodType<LegiWatchImpactAnalysis> = z.object({
  status: z.enum(["ready", "needs_evidence", "unavailable"]),
  summary: z.string(),
  direction,
  confidence,
  findings: z.array(
    z.object({
      title: z.string(),
      direction,
      mechanism: z.string(),
      confidence,
      provisions: z.array(citation),
      clientFacts: z.array(citation),
      conditions: z.array(z.string()),
      missingFacts: z.array(z.string()),
      nextAction: z.string(),
    }),
  ),
  missingFacts: z.array(z.string()),
  analyzedAt: z.string().nullable(),
  inputFingerprint: z.string().nullable(),
  stale: z.boolean(),
  staleReason: z.string().nullable(),
  model: z.string().nullable(),
});
export const impactRowSchema: z.ZodType<LegiWatchTrackerRow> = z.object({
  clientId: z.string().min(1),
  clientName: z.string(),
  billId: z.string().min(1),
  displayNum: z.string(),
  title: z.string(),
  jurisdiction: z.string(),
  status: z.string().nullable(),
  stage: z.enum(["introduced", "committee", "passed", "enacted"]).nullable(),
  passageProbability: z.number().min(0).max(1).nullable(),
  latestActionText: z.string().nullable(),
  latestActionDate: z.string().nullable(),
  sourceUrl: sourceUrl.nullable(),
  trackedAt: z.string(),
  note: z.string().nullable(),
  position: z.string().nullable(),
  priority: z.string().nullable(),
  trackerBackend: z.enum(["core", "intelligence"]),
  impact: impactSchema,
});
export const impactPageSchema: z.ZodType<LegiWatchTrackerPage> = z
  .object({
    trackerBackend: z.enum(["core", "intelligence"]),
    rows: z.array(impactRowSchema),
    total: z.number().int().nonnegative(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
    clients: z.array(z.object({ id: z.string().min(1), name: z.string() })),
    asOf: z.string(),
  })
  .refine(
    (page) => page.hasMore === Boolean(page.nextCursor),
    "Invalid tracker pagination",
  )
  .refine(
    (page) =>
      page.rows.every((row) => row.trackerBackend === page.trackerBackend),
    "Tracker owner mismatch",
  );
export const impactDetailSchema: z.ZodType<LegiWatchImpactDetail> = z.object({
  refresh: z
    .object({
      state: z.enum(["queued", "running", "idle", "failed"]),
      requestedAt: z.string().nullable(),
      nextCheckAt: z.string().nullable(),
      errorCode: z.string().nullable(),
    })
    .nullable()
    .optional(),
  row: impactRowSchema,
  actions: z.array(
    z.object({
      date: z.string().nullable(),
      text: z.string(),
      sourceUrl: sourceUrl.nullable(),
    }),
  ),
  versions: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      sourceUrl: sourceUrl.nullable(),
      publishedAt: z.string().nullable(),
      contentHash: z.string(),
      completeness: z.string(),
      current: z.boolean(),
    }),
  ),
  clientFacts: z.array(
    z.object({
      id: z.string(),
      kind: z.enum([
        "product",
        "location",
        "program",
        "supplier",
        "threshold",
        "profile",
      ]),
      label: z.string(),
      value: z.string(),
      revision: z.string(),
      citations: z.array(citation),
    }),
  ),
  sourceCoverage: z.object({
    billText: z.boolean(),
    clientFacts: z.boolean(),
    notes: z.array(z.string()),
  }),
});
export const impactParams = z
  .object({ clientId: z.string().min(1), billId: z.string().min(1) })
  .strict();
export const impactContextSchema = z
  .object({
    position: z.enum(["support", "oppose", "monitor"]).nullable(),
    priority: z.enum(["low", "med", "high"]).nullable(),
    analystNote: z.string().max(8000).nullable(),
  })
  .strict();
export type ImpactRow = LegiWatchTrackerRow;
export type ImpactDetail = LegiWatchImpactDetail;
export type ImpactAnalysis = LegiWatchImpactAnalysis;
export type ImpactContext = z.infer<typeof impactContextSchema>;
