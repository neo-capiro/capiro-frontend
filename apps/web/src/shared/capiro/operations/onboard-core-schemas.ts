import { z } from "zod";

/** Existing HTTP contract: capirov2@7b5a9644, Core firm controller. */
export const registrantHitSchema = z.object({
  id: z.number(),
  name: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  totalClients: z.number().int().nonnegative(),
  totalFilings: z.number().int().nonnegative(),
});
export const tenantRegistrantSchema = z.object({
  ldaRegistrantId: z.number().nullable(),
  ldaRegistrantName: z.string().nullable(),
});
export const importCandidateSchema = z.object({
  ldaClientId: z.number().int(),
  name: z.string(),
  filings: z.number().int().nonnegative(),
  latestFilingYear: z.number().nullable(),
  totalSpend: z.number(),
  onboardedAs: z.string().nullable(),
});
export const importCandidatesSchema = z.object({
  registrantId: z.number().nullable(),
  registrantName: z.string().nullable(),
  candidates: z.array(importCandidateSchema),
});

/**
 * Durable job view over the existing firm LDA importer. Source of truth:
 * Core ed56e53e3d4ae8fa2a1cc6107c0a269038d509b6 (firm-import-job contracts,
 * store, controller). Only item outcomes decide import completion.
 */
export const importJobStatusSchema = z.enum([
  "queued",
  "running",
  "partially_completed",
  "failed",
  "completed",
]);
export const importItemOutcomeSchema = z.enum([
  "pending",
  "created",
  "already_present",
  "rejected",
]);
export const importItemCodeSchema = z.enum([
  "NOT_OWN_CLIENT",
  "LDA_CLIENT_NOT_FOUND",
  "CLIENT_SLOT_LIMIT",
  "INTERNAL_ERROR",
]);
export const importJobCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  successful: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  outstanding: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  alreadyPresent: z.number().int().nonnegative(),
});
export const importChunkJobSummarySchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  status: importJobStatusSchema,
  stale: z.boolean(),
  counts: importJobCountsSchema,
});
export const importJobItemSchema = z.object({
  ldaClientId: z.number().int(),
  outcome: importItemOutcomeSchema,
  code: importItemCodeSchema.nullable(),
  clientId: z.string().nullable(),
  clientName: z.string().nullable(),
  processedAt: z.string().nullable(),
});
export const importJobPopulationSchema = z.object({
  total: z.number().int().nonnegative(),
  queued: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  partially_completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
});
export const importJobViewSchema = importChunkJobSummarySchema.extend({
  terminal: z.boolean(),
  staleAfterSeconds: z.number().int().nonnegative(),
  ldaRegistrantId: z.number().int(),
  requestedIds: z.array(z.number().int()),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  items: z.array(importJobItemSchema),
  population: importJobPopulationSchema.optional(),
});
export const importJobPageSchema = z.object({
  jobs: z.array(importJobViewSchema),
  nextCursor: z.string().nullable(),
  population: importJobPopulationSchema,
});
export const importJobStatusViewSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  status: importJobStatusSchema,
  terminal: z.boolean(),
  stale: z.boolean(),
  staleAfterSeconds: z.number().int().nonnegative(),
  counts: importJobCountsSchema,
  unresolved: z.array(z.number().int()),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});

export const importChunkResultSchema = z.object({
  created: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      ldaClientId: z.number().int(),
    }),
  ),
  skipped: z.array(
    z.object({ ldaClientId: z.number().int(), reason: z.string() }),
  ),
  job: importChunkJobSummarySchema,
});
