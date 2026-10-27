import { z } from "zod";
import { evidenceLocatorDetails } from "./defense-evidence-details";
// Public Core DTO projections. Unknown fields (including acquisition raw payloads) are stripped.
export const availability = z.enum(["available", "partial", "unavailable"]);
export const evidence = z.object({
  evidenceRefId: z.string(),
  sourceDocumentId: z.string().nullable(),
  sourceRevisionId: z.string().nullable(),
  sourceFamily: z.string(),
  publisher: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  nativeLocator: z.object({
    page: z.number().nullable(),
    section: z.string().nullable(),
    occurrenceId: z.string().nullable(),
    details: evidenceLocatorDetails.optional(),
  }),
  contentHash: z.string().nullable(),
  edition: z.string().nullable(),
  observedAt: z.string().nullable(),
  availability: availability.optional(),
  reason: z.string().nullable().optional(),
});
export const contextSummary = z.object({
  id: z.string(),
  family: z.string(),
  publisher: z.string(),
  title: z.string(),
  congress: z.number().nullable(),
  committee: z.string().nullable(),
  publishedAt: z.string().nullable(),
  status: z.string(),
  currentRevisionId: z.string().nullable(),
  transcriptAvailability: z.enum([
    "available",
    "partial",
    "unavailable",
    "not_applicable",
  ]),
  coverage: availability,
  sourceUrl: z.string().nullable(),
});
export const contextDetail = contextSummary.extend({
  coverageReason: z.string().nullable(),
  revisions: z.array(
    z.object({
      id: z.string(),
      version: z.string(),
      contentHash: z.string().nullable(),
      publishedAt: z.string().nullable(),
      observedAt: z.string(),
      status: z.string(),
      sourceUrl: z.string().nullable(),
    }),
  ),
  sections: z.array(
    z.object({
      id: z.string(),
      revisionId: z.string(),
      ordinal: z.number(),
      label: z.string(),
      nativeLocator: z.string().nullable(),
      textAvailability: availability,
      contentHash: z.string().nullable(),
    }),
  ),
});
export const officeSummary = z.object({
  id: z.string(),
  name: z.string(),
  officeType: z.string(),
  service: z.string().nullable(),
  parentOfficeName: z.string().nullable(),
  status: z.enum(["active", "historical", "superseded", "unresolved"]),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  reviewStatus: z.enum(["accepted", "candidate", "quarantined"]).nullable(),
  confidence: z.number(),
  observedAt: z.string(),
  effectiveStart: z.string().nullable(),
  effectiveEnd: z.string().nullable(),
  availability,
  evidence: z.array(evidence),
});
export const officeDetail = officeSummary.extend({
  mission: z.string().nullable(),
  responsibilities: z.string().nullable(),
  scope: z.string().nullable(),
});
export const relationship = z.object({
  id: z.string(),
  from: z.object({ type: z.string(), id: z.string(), label: z.string() }),
  to: z.object({ type: z.string(), id: z.string(), label: z.string() }),
  relation: z.string(),
  sourceStated: z.boolean(),
  derived: z.boolean(),
  inferred: z.boolean(),
  validity: z.enum(["valid", "candidate", "superseded", "unresolved"]),
  observationRevision: z.string().nullable(),
  evidence: z.array(evidence),
  reviewStatus: z.enum(["accepted", "candidate", "quarantined"]),
  supersessionImpact: z.string().nullable(),
});
export const acquisitionSummary = z.object({
  identityKey: z.string(),
  sourceSystem: z.string(),
  sourceRecordId: z.string(),
  recordKind: z.string(),
  title: z.string().nullable(),
  status: z.string().nullable(),
  buyerOffice: z.string().nullable(),
  postedAt: z.string().nullable(),
  responseDeadline: z.string().nullable(),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  contentHash: z.string(),
  sourceUrl: z.string().nullable(),
  sourceVersion: z.string().nullable(),
  sourceObservedAt: z.string().nullable(),
  recordedAt: z.string(),
  textAvailability: availability,
  amendmentCount: z.number(),
  openCoverageGaps: z.number(),
});
export const acquisitionDetail = acquisitionSummary.extend({
  revisions: z.array(
    z.object({
      id: z.string(),
      title: z.string().nullable(),
      status: z.string().nullable(),
      contentHash: z.string(),
      sourceUrl: z.string().nullable(),
      sourceVersion: z.string().nullable(),
      sourceObservedAt: z.string().nullable(),
    }),
  ),
  childIdentities: z.array(z.string()),
  amendmentIdentities: z.array(z.string()),
  associations: z.array(
    z.object({
      relationshipId: z.string(),
      relationshipClass: z.string(),
      subjectKind: z.string(),
      subjectKey: z.string(),
      subjectLabel: z.string().nullable(),
      allocatedAmountUsd: z.string().nullable(),
      reviewStatus: z.string(),
      sourceUrl: z.string().nullable(),
    }),
  ),
});
export const subjectType = z.enum([
  "program",
  "program_element",
  "project",
  "budget_line",
]);
const subject = z.object({
  type: subjectType,
  id: z.string(),
  label: z.string(),
});
export const dossier = z.object({
  subject,
  projectionVersion: z.literal("defense-dossier-v1"),
  fields: z.array(
    z.object({
      field: z.string(),
      availability,
      value: z.string().nullable(),
      reason: z.string().nullable(),
      fiscalPeriod: z.string().nullable(),
      metric: z.string().nullable(),
      unit: z.string().nullable(),
      evidence: z.array(evidence),
    }),
  ),
  coverage: z.object({
    state: availability,
    expectedFields: z.number(),
    availableFields: z.number(),
    partialFields: z.number(),
    unavailableFields: z.number(),
  }),
});
export const fundingMatrix = z.object({
  subject,
  projectionVersion: z.literal("defense-funding-matrix-v1"),
  cells: z.array(
    z.object({
      basis: z.object({
        requestEdition: z.string().nullable(),
        fundingFiscalYear: z.number(),
        stage: z.string(),
        metric: z.enum(["funding", "quantity", "unit_cost"]),
        unit: z.enum(["usd_millions", "units", "usd_millions_per_unit"]),
        currency: z.literal("USD"),
        priceBasis: z.string().nullable(),
        knownAt: z.string().nullable(),
        knowledgeTimeSupported: z.boolean(),
      }),
      value: z.string().nullable(),
      disposition: z.enum([
        "observed",
        "missing",
        "partial",
        "unavailable",
        "withheld",
      ]),
      sourceObservationId: z.string(),
      replacedByObservationId: z.string().nullable(),
      evidence: z.array(evidence),
    }),
  ),
  supported: z.object({
    fiscalYears: z.array(z.number()),
    editions: z.array(z.string()),
    stages: z.array(z.string()),
    metrics: z.array(z.string()),
    knownAt: z.boolean(),
  }),
  limitations: z.array(z.string()),
});
