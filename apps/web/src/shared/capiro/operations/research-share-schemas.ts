import { z } from "zod";

/**
 * Research Portfolio client share links: PIN-protected, one-week, frozen
 * dashboard at a Capiro link. Shapes follow packages/shared research-portfolios
 * (ResearchPortfolioShare*, ResearchPortfolioDashboard*).
 */
export const researchDashboardWidgetKind = z.enum([
  "header",
  "key_totals",
  "funding_table",
  "client_fit",
  "changes",
  "subjects",
  "sources",
  "snapshot_comparison",
  "commentary",
  "image",
]);
export const researchDashboardWidget = z.object({
  id: z.string().min(1).max(64),
  kind: researchDashboardWidgetKind,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1),
  settings: z.record(z.string(), z.unknown()),
});
export const researchDashboardLayout = z.object({
  columns: z.literal(12),
  widgets: z.array(researchDashboardWidget).max(40),
  phoneOrder: z.array(z.string()),
});
export const researchDashboardDesign = z.object({
  id: z.string(),
  portfolioId: z.string(),
  name: z.string(),
  version: z.number(),
  layout: researchDashboardLayout,
  createdByUserId: z.string(),
  updatedByUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const researchShareSettings = z.object({
  portfolioId: z.string(),
  enabled: z.boolean(),
  pinSet: z.boolean(),
  pinUpdatedAt: z.string().nullable(),
  activeLinkCount: z.number(),
  updatedAt: z.string().nullable(),
});
export const researchShareLink = z.object({
  id: z.string(),
  portfolioId: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  snapshotId: z.string(),
  snapshotName: z.string(),
  designId: z.string().nullable(),
  designVersion: z.number(),
  branding: z.boolean(),
  status: z.enum(["active", "expired", "revoked"]),
  publishedByUserId: z.string(),
  publishedAt: z.string(),
  expiresAt: z.string(),
  revokedAt: z.string().nullable(),
  openCount: z.number(),
  lastOpenedAt: z.string().nullable(),
  failedPinAttempts: z.number(),
});
export const researchShareLinkPublished = z.object({
  link: researchShareLink,
  token: z.string().nullable(),
  replayed: z.boolean(),
});
const financialBasis = z.object({
  requestEdition: z.string().nullable(),
  fundingFiscalYear: z.number(),
  stage: z.string(),
  metric: z.string(),
  unit: z.string(),
  currency: z.string(),
  priceBasis: z.string().nullable(),
  knownAt: z.string().nullable(),
});
const compatibleTotal = z.object({
  basis: financialBasis,
  value: z.string(),
  contributionCount: z.number(),
});
/** What a recipient sees; frozen at publish time. Loose objects keep future payload fields readable. */
export const researchShareDashboard = z.object({
  schemaVersion: z.literal(1),
  portfolioName: z.string(),
  portfolioPurpose: z.string().nullable(),
  asOf: z.string(),
  preparedFor: z.object({ clientName: z.string() }),
  branding: z
    .object({ firmName: z.string(), logoAvailable: z.boolean() })
    .nullable(),
  layout: researchDashboardLayout,
  data: z.object({
    totals: z.array(compatibleTotal),
    contributions: z.array(
      z.looseObject({
        contributionId: z.string(),
        targetKind: z.string(),
        targetId: z.string(),
        label: z.string().nullable(),
        basis: financialBasis.nullable(),
        value: z.string().nullable(),
        disposition: z.string(),
        reason: z.string(),
        sourceRevisionIds: z.array(z.string()),
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
    subjects: z.array(
      z.object({
        id: z.string(),
        targetKind: z.string(),
        targetId: z.string(),
        label: z.string().nullable(),
        disposition: z.string(),
      }),
    ),
    sources: z.array(z.object({ id: z.string() })),
    clientFit: z
      .object({
        availability: z.enum(["available", "partial", "unavailable"]),
        fitScore: z.number().nullable(),
        basis: z.record(z.string(), z.unknown()).nullable(),
        refreshedAt: z.string().nullable(),
      })
      .nullable(),
    changes: z.array(
      z.object({
        id: z.string(),
        eventKind: z.string(),
        occurredAt: z.string(),
        summary: z.string(),
      }),
    ),
    comparison: z
      .object({
        snapshotId: z.string(),
        snapshotName: z.string(),
        capturedAt: z.string(),
        totals: z.array(compatibleTotal),
      })
      .nullable(),
  }),
  snapshot: z.object({
    id: z.string(),
    name: z.string(),
    capturedAt: z.string(),
    portfolioRevision: z.number(),
    calculationVersion: z.string(),
  }),
  publishedAt: z.string(),
  expiresAt: z.string(),
});
export const researchShareAvailability = z.object({ available: z.boolean() });
export const researchShareViewSession = z.object({
  viewToken: z.string(),
  expiresAt: z.string(),
});
/** 6 to 12 digits, matching the Core service rule. */
export const researchSharePin = z.string().regex(/^[0-9]{6,12}$/);

export type ResearchDashboardWidgetKind = z.infer<
  typeof researchDashboardWidgetKind
>;
export type ResearchDashboardWidget = z.infer<typeof researchDashboardWidget>;
export type ResearchDashboardLayout = z.infer<typeof researchDashboardLayout>;
export type ResearchDashboardDesign = z.infer<typeof researchDashboardDesign>;
export type ResearchShareSettings = z.infer<typeof researchShareSettings>;
export type ResearchShareLink = z.infer<typeof researchShareLink>;
export type ResearchShareDashboard = z.infer<typeof researchShareDashboard>;
