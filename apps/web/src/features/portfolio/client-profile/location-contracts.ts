import { z } from "zod";

export const locationSourceSchema = z.object({
  sourceUrl: z.string().optional(),
  evidence: z.string().optional(),
  sourceType: z.string(),
  attachmentId: z.string().optional(),
});
const boundaryVersionSchema = z.object({
  congress: z.number().int().nullable().optional(),
  stateLegislativeYear: z.number().int().nullable().optional(),
  benchmark: z.string().nullable().optional(),
  vintage: z.string().nullable().optional(),
  geometryVersion: z.string().nullable().optional(),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
});
export const geographicResolutionSchema = z.object({
  status: z.enum([
    "resolved",
    "needs_address",
    "ambiguous",
    "source_unavailable",
    "not_applicable",
    "stale_boundary",
  ]),
  precision: z.string().nullable().optional(),
  requiresReview: z.boolean().optional(),
  source: z.string().nullable().optional(),
  version: boundaryVersionSchema.nullable().optional(),
  stateFips: z.string().nullable().optional(),
  districts: z
    .array(
      z.object({
        chamber: z.string(),
        code: z.string(),
        geoid: z.string().nullable().optional(),
        stateFips: z.string().nullable().optional(),
        layer: z.string().optional(),
        providerCode: z.string().optional(),
        congress: z.number().int().nullable().optional(),
      }),
    )
    .default([]),
  resolvedAt: z.string().nullable().optional(),
  reason: z.string().optional(),
  boundaryAdjacent: z.boolean().optional(),
  overrideConflict: z
    .object({ handEntered: z.string(), geocoded: z.string() })
    .optional(),
  providerEvidence: z.record(z.string(), z.json()).optional(),
});
export const locationFields = {
  country: z.string().nullable().optional(),
  siteRole: z.string().nullable().optional(),
  siteStatus: z.string().nullable().optional(),
  siteVerificationStatus: z
    .enum(["unverified", "verified", "proposed", "closed"])
    .nullable()
    .optional(),
  sourceEvidence: z.array(locationSourceSchema).nullable().optional(),
  sourceEvidenceUnavailable: z.boolean().optional(),
  sourceObservedAt: z.string().nullable().optional(),
  verifiedPoint: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      verifiedAt: z.string(),
    })
    .nullable()
    .optional(),
  capabilityIds: z.array(z.uuid()).optional(),
  economicImpact: z
    .object({
      jobs: z.number().nonnegative().optional(),
      payroll: z.number().nonnegative().optional(),
      investment: z.number().nonnegative().optional(),
      facilitySize: z.number().nonnegative().optional(),
      facilitySizeUnit: z.string().optional(),
      suppliersInState: z.number().nonnegative().optional(),
      observedAt: z.string().optional(),
      evidence: z.array(locationSourceSchema),
      sourceUnavailable: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  geographicResolution: geographicResolutionSchema.nullable().optional(),
  geographicHistory: z.array(geographicResolutionSchema).nullable().optional(),
};
