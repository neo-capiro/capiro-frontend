import { z } from "zod";
export const researchSummary = z.object({
  id: z.string(),
  name: z.string(),
  purpose: z.string().nullable(),
  mode: z.enum(["manual", "rules", "hybrid"]),
  lifecycle: z.enum(["active", "archived"]),
  revision: z.number().int(),
  ownerUserId: z.string(),
  memberCount: z.number(),
  clientLinkCount: z.number(),
  myRole: z.enum(["owner", "editor", "viewer"]),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const researchMember = z.object({
  id: z.string(),
  targetKind: z.enum([
    "program",
    "program_element",
    "project",
    "budget_line",
    "award",
  ]),
  targetId: z.string(),
  label: z.string().nullable(),
  disposition: z.enum([
    "included",
    "candidate",
    "withdrawn",
    "excluded",
    "unresolved",
  ]),
  origin: z.enum(["manual", "rule", "import"]).optional(),
  unresolvedInput: z.record(z.string(), z.unknown()).nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  reason: z.string().nullable(),
  revision: z.number().int(),
  updatedAt: z.string(),
});
export const researchEvent = z.object({
  id: z.string(),
  eventKind: z.string(),
  aggregateRevision: z.number(),
  actorUserId: z.string(),
  occurredAt: z.string(),
});
export const researchClient = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  linkedByUserId: z.string(),
  createdAt: z.string(),
});
export const researchGrant = z.object({
  id: z.string(),
  principalType: z.literal("user"),
  principalUserId: z.string(),
  role: z.enum(["owner", "editor", "viewer"]),
  grantedByUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const researchDetail = researchSummary.extend({
  members: z.array(researchMember),
  clientLinks: z.array(researchClient),
  grants: z.array(researchGrant),
  recentEvents: z.array(researchEvent),
});
export const researchReceipt = z.object({
  portfolioId: z.string(),
  eventId: z.string(),
  actorUserId: z.string(),
  occurredAt: z.string(),
  resultingRevision: z.number().int(),
  replayed: z.boolean(),
  outcomes: z.array(
    z.object({
      targetId: z.string(),
      targetType: z.string(),
      status: z.string(),
      id: z.string().nullable(),
      message: z.string().optional(),
    }),
  ),
});
export const researchBasis = z.object({
  requestEdition: z.string().nullable(),
  fundingFiscalYear: z.number(),
  stage: z.string(),
  metric: z.enum(["funding", "quantity", "unit_cost"]),
  unit: z.enum(["usd_millions", "units", "usd_millions_per_unit"]),
  currency: z.literal("USD"),
  priceBasis: z.string().nullable(),
  knownAt: z.string().nullable(),
});
export const researchAnalytics = z.object({
  portfolioId: z.string(),
  portfolioRevision: z.number(),
  calculationVersion: z.enum([
    "research-portfolio-analytics-v1",
    "research-portfolio-analytics-v2",
  ]),
  availability: z.enum(["available", "partial", "unavailable"]),
  totals: z.array(
    z.object({
      basis: researchBasis,
      value: z.string(),
      contributionCount: z.number(),
    }),
  ),
  contributions: z.array(
    z.object({
      contributionId: z.string(),
      memberId: z.string(),
      targetKind: researchMember.shape.targetKind,
      targetId: z.string(),
      label: z.string().nullable(),
      basis: researchBasis.nullable(),
      value: z.string().nullable(),
      disposition: z.enum([
        "included",
        "excluded",
        "overlap",
        "incompatible",
        "missing",
        "unavailable",
        "withheld",
      ]),
      sourceDisposition: z
        .enum(["observed", "missing", "partial", "unavailable", "withheld"])
        .nullable()
        .optional(),
      reason: z.string(),
      sourceObservationId: z.string().nullable(),
      sourceRevisionIds: z.array(z.string()),
      evidence: z.array(z.record(z.string(), z.unknown())),
      dedupKey: z.string().nullable(),
      overlapsContributionId: z.string().nullable(),
    }),
  ),
  coverage: z.object({
    eligibleMembers: z.number(),
    supportedMembers: z.number(),
    includedContributions: z.number(),
    excludedContributions: z.number(),
    overlapContributions: z.number(),
    unavailableMembers: z.number(),
  }),
  limitations: z.array(z.string()),
  observedAt: z.string(),
  readAt: z.string(),
});
// Below Core's existing 1 MiB JSON parser, including the browser operation envelope.
export const researchDecisionRequestLimitBytes = 1_000_000;
export const researchReviewEvidence = z.object({
  sourceRevisionId: z.string().min(1).max(2048),
  locator: z.record(z.string(), z.unknown()),
  quote: z.string().max(10000).nullable(),
  stance: z.enum(["for", "against"]),
});
export const researchReviewMutationReceipt = z.object({
  portfolioId: z.string(),
  actorUserId: z.string(),
  occurredAt: z.string(),
  outcomes: z
    .array(
      z.object({
        reviewId: z.string().nullable(),
        status: z.enum([
          "assigned",
          "decided",
          "unchanged",
          "conflict",
          "failed",
          "note_added",
        ]),
        revision: z.number().nullable(),
        decisionId: z.string().nullable().optional(),
        noteId: z.string().nullable().optional(),
        message: z.string().nullable(),
      }),
    )
    .max(50),
});
export const researchFit = z.object({
  clientFits: z.array(
    z.object({
      clientId: z.string(),
      clientName: z.string(),
      fitScore: z.number().nullable(),
      availability: z.string().optional(),
      refreshedAt: z.string().nullable(),
    }),
  ),
  limitations: z.array(z.string()).optional(),
  calculatedAt: z.string(),
});
export const researchReview = z.object({
  id: z.string(),
  portfolioId: z.string(),
  targetKind: z.string(),
  targetId: z.string(),
  trigger: z.string(),
  assigneeUserId: z.string().nullable(),
  reason: z.string(),
  evidenceFor: z
    .array(researchReviewEvidence.extend({ stance: z.literal("for") }))
    .max(100),
  evidenceAgainst: z
    .array(researchReviewEvidence.extend({ stance: z.literal("against") }))
    .max(100),
  revision: z.number(),
  status: z.string(),
  updatedAt: z.string(),
});
export const researchState = z.object({
  eventId: z.string(),
  recipientUserId: z.string(),
  revision: z.number(),
  seenAt: z.string().nullable(),
  acknowledgedAt: z.string().nullable(),
  dismissedAt: z.string().nullable(),
  updatedAt: z.string(),
});
export const researchSnapshot = z.object({
  id: z.string(),
  portfolioId: z.string(),
  name: z.string(),
  portfolioRevision: z.number(),
  contentHash: z.string(),
  capturedAt: z.string(),
  calculationVersion: z.string(),
});
export const researchSubscription = z.object({
  id: z.string(),
  portfolioId: z.string(),
  targetKind: z.string(),
  targetId: z.string(),
  channel: z.enum(["in_app", "email"]),
  cadence: z.enum(["immediate", "daily", "weekly"]),
  active: z.boolean(),
  baselineRevision: z.number(),
  updatedAt: z.string(),
});
export type ResearchSummary = z.infer<typeof researchSummary>;
export type ResearchDetail = z.infer<typeof researchDetail>;
export type ResearchMember = z.infer<typeof researchMember>;
export type ResearchAnalyticsProjection = z.infer<typeof researchAnalytics>;
export type ResearchReview = z.infer<typeof researchReview>;
export type ResearchReviewEvidence = z.infer<typeof researchReviewEvidence>;
