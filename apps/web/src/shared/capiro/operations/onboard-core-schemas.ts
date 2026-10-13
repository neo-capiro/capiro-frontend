import { z } from "zod";

/** Existing HTTP contract: capirov2@7b5a9644, Core firm/memory controllers. */
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
});
export const memorySectionDefSchema = z.object({
  key: z.string(),
  heading: z.string(),
  prompt: z.string(),
  example: z.string(),
});
export const memoryFileDefSchema = z.object({
  type: z.string(),
  scope: z.enum(["firm", "client", "user"]),
  label: z.string(),
  blurb: z.string(),
  sections: z.array(memorySectionDefSchema),
});
export const firmMemoryTypeSchema = z.enum([
  "firm-soul",
  "firm-compass",
  "playbook",
]);
export const memorySectionsFileSchema = z.object({
  type: z.string(),
  slug: z.string(),
  title: z.string(),
  visibility: z.string(),
  clientId: z.string().nullable(),
  updatedAt: z.string().nullable(),
  exists: z.boolean(),
  pendingReview: z
    .object({
      candidateId: z.string().min(1),
      status: z.literal("pending_review"),
      submittedAt: z.string(),
    })
    .nullable(),
  sections: z.array(
    memorySectionDefSchema.extend({ owner: z.string(), body: z.string() }),
  ),
});
export const memoryReviewReceiptSchema = z.object({
  status: z.literal("pending_review"),
  candidateId: z.string().min(1),
  activeItemUnchanged: z.literal(true),
});
