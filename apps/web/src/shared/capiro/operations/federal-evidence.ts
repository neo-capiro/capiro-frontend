import { z } from "zod";
import { defineOperation } from "../contracts";
import { evidenceTextSpan } from "./defense-evidence-details";

export const federalEvidenceSide = z.object({
  availability: z.enum(["available", "partial", "unavailable"]),
  reason: z.string().nullable(),
  revisionId: z.string().nullable(),
  contentHash: z.string().nullable(),
  extractionHash: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  locator: z.string().nullable(),
  textSpan: evidenceTextSpan.nullable(),
  evidence: z.string().nullable(),
  languageHash: z.string().nullable(),
  qualificationState: z.string().nullable(),
  publishedAt: z.string().nullable(),
  sourceModifiedAt: z.string().nullable(),
});
export const federalEvidenceEvent = z.object({
  id: z.string(),
  eventType: z.string(),
  canonicalPeCode: z.string().nullable(),
  billId: z.string().nullable(),
  previousRevisionId: z.string().nullable(),
  currentRevisionId: z.string().nullable(),
  createdAt: z.string(),
  historical: z.boolean(),
  beforeEvidence: federalEvidenceSide.optional(),
  afterEvidence: federalEvidenceSide.optional(),
});
export const federalTimelineQuery = z
  .object({
    peCode: z.string().trim().min(1).max(16),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().min(1).max(4096).optional(),
    knownAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();
export const federalEvidenceOperations = {
  "defenseResearch.federalTimeline": defineOperation({
    service: "core",
    method: "GET",
    path: "/federal-evidence/timeline",
    request: z.object({ query: federalTimelineQuery }).strict(),
    response: z.object({
      items: z.array(federalEvidenceEvent),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    }),
    source:
      "capiro-backend@b49f01017 FederalEvidenceReadService.lifecycleTimeline; packages/shared/src/defense-research.ts DefenseFederalEvidenceSideDto",
  }),
} as const;
