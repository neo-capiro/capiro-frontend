import { z } from "zod";
import { capabilitySchema } from "./contracts";
import { evidenceSchema, portfolioProposalSchema } from "./proposal-contracts";

export const termSchema = z.object({
  id: z.uuid(),
  capabilityId: z.uuid(),
  kind: z.enum(["keyword", "tag", "pe", "program", "naics", "psc"]),
  value: z.string(),
  evidence: z.array(evidenceSchema),
  approvedAt: z.string(),
});
export const trackingRecordSchema = z.object({
  id: z.string(),
  capabilityId: z.uuid(),
  itemKind: z.enum(["bill", "hearing", "budget", "grant", "news", "statement"]),
  itemId: z.string(),
  status: z.enum(["active", "pending", "dismissed"]),
  termIds: z.array(z.uuid()),
  title: z.string().optional(),
  url: z.string().nullable().optional(),
  occurredAt: z.string().nullable().optional(),
  explanation: z.string().optional(),
  dateKind: z.enum(["published", "scheduled", "observed"]).optional(),
});
export const relationshipStatusSchema = z.enum([
  "planned",
  "introduced",
  "in_discussion",
  "supportive",
  "champion",
  "declined",
  "uncontacted",
]);
export const relationshipSchema = z.object({
  id: z.uuid(),
  memberId: z.string(),
  sourceDirectory: z.enum(["congress", "state", "staff"]),
  relationshipStatus: relationshipStatusSchema,
  ownerUserId: z.uuid().nullable(),
  lastContactAt: z.string().nullable(),
  nextStep: z.string().nullable(),
  stance: z.string(),
  officeTerm: z.string().nullable(),
  version: z.number().int().positive(),
});
export const supportSchema = z.object({
  id: z.uuid(),
  targetId: z.uuid(),
  capabilityId: z.uuid(),
  stance: z.enum([
    "unknown",
    "interested",
    "supportive",
    "champion",
    "declined",
  ]),
  evidence: z.array(evidenceSchema),
  approvedAt: z.string(),
  version: z.number().int().positive(),
  history: z
    .array(
      z.object({
        stance: z.string(),
        previousStance: z.string().nullable(),
        evidence: z.array(evidenceSchema).default([]),
        sourceUnavailable: z.boolean().optional(),
        at: z.string(),
      }),
    )
    .default([]),
});
export const portfolioDepthSchema = z.object({
  capabilities: z.array(capabilitySchema),
  proposals: z.array(portfolioProposalSchema),
  terms: z.array(termSchema),
  tracking: z.array(trackingRecordSchema),
  relationships: z.array(relationshipSchema),
  supports: z.array(supportSchema),
  memberView: z.object({
    fields: z.array(portfolioProposalSchema),
    gaps: z.array(z.string()),
  }),
  sectorAnchors: z.array(portfolioProposalSchema),
  businessUnits: z.array(portfolioProposalSchema),
  relationshipConflicts: z
    .array(
      z.object({
        targetId: z.uuid(),
        otherClientId: z.uuid(),
        otherClientName: z.string(),
        stance: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
});
export type PortfolioDepth = z.infer<typeof portfolioDepthSchema>;
export type CapabilityTerm = z.infer<typeof termSchema>;
export type TrackingRecord = z.infer<typeof trackingRecordSchema>;
export type OfficeRelationship = z.infer<typeof relationshipSchema>;
export type CapabilitySupport = z.infer<typeof supportSchema>;
export const discoveryResultSchema = z.object({
  proposals: z.array(portfolioProposalSchema),
  hasMore: z.boolean(),
  nextCursor: z.uuid().nullable(),
});
export const trackingFeedSchema = z.object({
  items: z.array(trackingRecordSchema),
  pending: z.array(trackingRecordSchema),
  terms: z.array(termSchema),
  clientTrackingPreserved: z.literal(true),
  sourceStatus: z.string(),
  gaps: z.array(z.string()),
  truncated: z.boolean(),
});
