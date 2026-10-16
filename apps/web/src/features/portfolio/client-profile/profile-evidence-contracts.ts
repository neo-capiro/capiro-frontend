import { z } from "zod";

// Receiving subsets of existing Core DTOs; exact provenance is in the handoff.
const number = z.number().finite();
const nullableNumber = number.nullable();
const nullableText = z.string().nullable();
const strings = z.array(z.string());
const economicSource = z.enum(["acs", "cbp", "lodes"]);
const sourceStatus = z.enum([
  "running",
  "success",
  "success_with_errors",
  "failed",
  "unavailable",
]);
const reviewStatus = z.enum(["pending_review", "approved", "rejected"]);
const verificationStatus = z.enum([
  "source_verified",
  "geocode_verified",
  "user_provided",
  "inferred",
]);
const footprintTotals = z.object({
  approvedEvidenceCount: number,
  pendingEvidenceCount: number,
  facilityCount: number,
  employeeCount: nullableNumber,
  payroll: nullableNumber,
  capitalInvestment: nullableNumber,
  taxes: nullableNumber,
  supplierCount: number,
  supplierSpend: nullableNumber,
  partnerCount: number,
  beneficiaryCount: nullableNumber,
  projectSiteCount: number,
});
const footprintDistrict = footprintTotals.extend({
  districtKey: z.string(),
  state: z.string(),
  districtCode: z.string(),
  boundaryCongresses: z.array(number),
  externalUseApprovedCount: number,
});
const footprintEvidence = z.object({
  id: z.string(),
  importId: nullableText,
  rowOrdinal: nullableNumber,
  evidenceType: z.enum([
    "facility",
    "employee",
    "payroll",
    "capital_investment",
    "taxes",
    "supplier",
    "supplier_spend",
    "partner",
    "beneficiary",
    "beneficiary_count",
    "project_site",
    "other",
  ]),
  subjectName: nullableText,
  subjectId: nullableText,
  state: nullableText,
  congressionalDistrict: nullableText,
  boundaryCongress: nullableNumber,
  numericValue: nullableNumber,
  unit: nullableText,
  currency: nullableText,
  verificationStatus,
  reviewStatus,
  externalUseApproved: z.boolean(),
  effectiveFrom: nullableText,
  effectiveTo: nullableText,
  observedAt: nullableText,
  promotedFacilityId: nullableText,
  createdAt: z.string(),
  reviewedAt: nullableText,
});
const footprint = z.object({
  clientId: z.string(),
  districts: z.array(footprintDistrict),
  imports: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
      format: z.enum(["csv", "xlsx", "manual", "meri_structured"]),
      status: z.enum(["preview", "committed", "failed", "superseded"]),
      rowCount: number,
      acceptedCount: number,
      rejectedCount: number,
      effectiveDate: nullableText,
      externalUseApproved: z.boolean(),
      createdAt: z.string(),
      committedAt: nullableText,
      warnings: strings,
    }),
  ),
  evidence: z.array(footprintEvidence),
  coverage: z.object({ percent: number, measured: strings, missing: strings }),
  totals: footprintTotals,
  warnings: strings,
  generatedAt: z.string(),
});
const economicContext = z.object({
  districtKey: z.string(),
  state: z.string(),
  districtCode: z.string(),
  metrics: z.array(
    z.object({
      source: economicSource,
      dataset: z.string(),
      sourceYear: number,
      boundaryCongress: nullableNumber,
      metricKey: z.string(),
      value: nullableNumber,
      unit: nullableText,
      marginOfError: nullableNumber,
      naicsCode: nullableText,
      sourceRecordId: nullableText,
      sourceUrl: nullableText,
      observedAt: nullableText,
      lastSyncedAt: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      source: economicSource,
      dataset: z.string(),
      sourceYear: nullableNumber,
      boundaryCongress: nullableNumber,
      status: sourceStatus,
      lastAttemptAt: z.string(),
      lastCompletedAt: nullableText,
      rowsSeen: number,
      rowsWritten: number,
      rowsRejected: number,
      error: nullableText,
      annual: z.literal(true),
    }),
  ),
  warnings: strings,
  generatedAt: z.string(),
});
const strategicComponent = z.enum([
  "committeeJurisdiction",
  "programElementBudget",
  "activeLegislation",
  "activeStrategyTarget",
  "relationshipEngagement",
  "hearingTiming",
  "opportunityFunding",
  "memberHistoricalPriorities",
]);
const breakdown = z.object({
  component: strategicComponent,
  label: z.string(),
  weight: number,
  credit: nullableNumber,
  status: z.enum(["scored", "missing", "unavailable", "stale"]),
  rationale: z.string(),
  evidenceCount: number,
});
const strategic = z.object({
  districtKey: z.string(),
  state: z.string(),
  district: z.string(),
  clientId: z.string(),
  clientName: nullableText,
  memberBioguides: strings,
  strategic: z.object({
    score: nullableNumber,
    coveragePercent: number,
    breakdown: z.array(breakdown),
    evidence: z.array(
      z.object({
        component: strategicComponent,
        sourceType: z.string(),
        label: z.string(),
        sourceRecordId: nullableText,
        observedAt: nullableText,
        summary: z.string(),
      }),
    ),
    missingComponents: z.array(strategicComponent),
    unavailableComponents: z.array(strategicComponent),
    strongestDrivers: z.array(breakdown),
    freshness: z.array(
      z.object({
        source: z.string(),
        label: z.string(),
        lastSyncedAt: nullableText,
        neverSynced: z.boolean(),
        freshnessUnavailable: z.boolean().optional(),
      }),
    ),
    conflicts: z.array(
      z.object({
        code: z.enum([
          "stale_source",
          "geography_vintage_conflict",
          "incomplete_strategic_evidence",
          "inferred_link_excluded",
          "private_engagement_redacted",
          "component_unavailable",
        ]),
        message: z.string(),
        component: strategicComponent.optional(),
      }),
    ),
    scoreVersion: z.string(),
    weightsVersion: z.string(),
    minCoveragePercent: number,
    computedAt: z.string(),
  }),
  nexusStrength: z
    .object({ score: nullableNumber, coveragePercent: number })
    .nullable(),
  strategicEnabled: z.literal(true),
});
const scoreEcho = z
  .object({
    score: nullableNumber,
    coveragePercent: nullableNumber,
    scoreVersion: z.string(),
  })
  .nullable();
const geography = z.discriminatedUnion("basis", [
  z.object({
    basis: z.literal("house_district"),
    state: z.string(),
    district: z.string(),
  }),
  z.object({ basis: z.literal("senate_statewide"), state: z.string() }),
  z.object({
    basis: z.literal("senate_project_district"),
    state: z.string(),
    district: z.string(),
  }),
  z.object({ basis: z.literal("unresolved"), reason: z.string() }),
]);
const fundingRequest = z.object({
  requestId: z.string(),
  chamber: z.enum(["house", "senate"]),
  requestType: z.enum(["cpf", "cds"]),
  fiscalYear: number,
  requesterName: z.string(),
  recipientName: z.string(),
  projectTitle: z.string(),
  districtKey: nullableText,
  geography,
  requestedAmountUsd: number,
  finalAmountUsd: nullableNumber,
  amountStageRaw: z.string(),
  appropriationsAccountRaw: nullableText,
  sourceOccurrenceCount: number,
  clientAttribution: z
    .object({
      method: z.enum([
        "confirmed_client_intel_mapping",
        "exact_recipient_normalized",
        "exact_alias",
      ]),
      evidenceId: nullableText,
    })
    .nullable(),
});
const priority = z.object({
  clientId: z.string(),
  clientName: z.string(),
  districtKey: z.string(),
  state: z.string(),
  district: z.string(),
  member: z.object({
    houseMemberBioguideIds: strings,
    senatorBioguideIds: strings,
    representation: z.string(),
  }),
  nexusStrength: scoreEcho,
  strategicRelevance: scoreEcho,
  dataCoverage: z
    .object({ coveragePercent: nullableNumber, missingInputs: strings })
    .nullable(),
  priorityIntelligence: z.object({
    cpfCds: z.object({
      availability: z.object({
        status: z.enum(["unavailable", "loaded"]),
        reason: z.enum(["corpus_not_loaded", "source_error"]).nullable(),
        lastIngestRunAt: nullableText,
        loadedFiscalYears: z.array(number),
      }),
      districtRequests: z.array(fundingRequest),
      clientRequests: z.array(fundingRequest),
      memberHistoricalPriorities: z.array(
        z.object({
          bioguideId: z.string(),
          memberName: z.string(),
          attributionMethod: z.literal("source_requester_name"),
          chamber: z.enum(["house", "senate"]),
          state: nullableText,
          fiscalYears: z.array(number),
          requestedTotalUsd: number,
          finalTotalUsd: number,
          includesStatewideAttribution: z.boolean(),
        }),
      ),
      warnings: strings,
    }),
    federalProperty: z.object({
      availability: z.object({
        status: z.enum(["loaded", "not_loaded", "stale", "error"]),
        reason: nullableText,
        lastSuccessAt: nullableText,
        lastFailureAt: nullableText,
        lastError: nullableText,
      }),
      detailedAssetCount: nullableNumber,
      detailedSquareFeetTotal: nullableNumber,
      summarizedInstallationCount: nullableNumber,
      ownedCount: nullableNumber,
      leasedCount: nullableNumber,
      agenciesByAssetCount: z.array(
        z.object({ agency: z.string(), assetCount: number }),
      ),
      fiscalYears: z.array(number),
      boundaryCongresses: z.array(nullableNumber),
      warnings: strings,
    }),
    sectorSignals: z.object({
      availability: z.object({
        status: z.enum(["loaded", "not_loaded", "stale"]),
        sources: z.array(
          z.object({
            source: z.enum([
              "cbp",
              "lodes",
              "acs",
              "gsa",
              "federal_awards",
              "program_element",
            ]),
            dataset: z.string(),
            sourceYear: nullableNumber,
            lastSyncedAt: nullableText,
            lastRunStatus: z
              .enum([
                "success",
                "success_with_errors",
                "failed",
                "unavailable",
                "running",
                "no_run",
              ])
              .nullable(),
          }),
        ),
      }),
      warnings: strings,
    }),
    recentChanges: z.array(
      z.object({
        changeKind: z.string(),
        source: z.string(),
        sourceRecordId: z.string(),
        state: nullableText,
        district: nullableText,
        boundaryCongress: nullableNumber,
        observedAt: z.string(),
        effectiveAt: nullableText,
        sourceYear: nullableNumber,
        geographyVintage: nullableText,
        severity: z.enum(["info", "notable", "material"]),
      }),
    ),
  }),
  strongestPrioritySignals: strings,
  missingPrioritySources: strings,
  freshness: z.array(
    z.object({
      rail: z.enum([
        "cpf_cds",
        "gsa",
        "sector_cbp",
        "sector_acs",
        "sector_lodes",
        "changes",
      ]),
      status: z.enum(["current", "stale", "not_loaded", "failed"]),
      sourceYear: nullableNumber,
      lastSuccessAt: nullableText,
      lastAttemptAt: nullableText,
      stale: z.boolean(),
    }),
  ),
  geographyVintage: z.object({
    boundaryCongress: nullableNumber,
    conflict: z.boolean(),
    detail: nullableText,
  }),
  warnings: strings,
  computedAt: z.string(),
});

export type ProfileDistrictScope = Readonly<{
  state: string;
  districtCode: string;
}>;
export type ProfileEvidenceScope = Readonly<{
  clientId: string;
  facilityId: string;
  district: ProfileDistrictScope | null;
}>;

/** Normalize identity only; this is not a current seat/roster or authority check. */
export function normalizeProfileDistrict(input: {
  state: string | null;
  districtCode: string | null;
}): ProfileDistrictScope | null {
  const state = input.state?.trim().toUpperCase();
  let code = input.districtCode?.trim().toUpperCase();
  if (!state || !/^[A-Z]{2}$/.test(state) || !code) return null;
  if (code.startsWith(state + "-")) code = code.slice(3);
  if (code === "AL") code = "00";
  if (!/^\d{1,2}$/.test(code) || Number(code) >= 90) return null;
  return { state, districtCode: String(Number(code)).padStart(2, "0") };
}
function sameDistrict(
  value: { districtKey: string; state: string },
  code: string,
  scope: ProfileDistrictScope,
) {
  return (
    value.state === scope.state &&
    code === scope.districtCode &&
    value.districtKey === scope.state + "-" + scope.districtCode
  );
}
export const profileEconomicFootprintSchema = (clientId: string) =>
  footprint.refine((value) => value.clientId === clientId, "Different client.");
export const profileDistrictEconomicContextSchema = (
  scope: ProfileDistrictScope,
) =>
  economicContext.refine(
    (value) => sameDistrict(value, value.districtCode, scope),
    "Different district.",
  );
export const profileDistrictStrategicSchema = (
  clientId: string,
  scope: ProfileDistrictScope,
) =>
  strategic.refine(
    (value) =>
      value.clientId === clientId && sameDistrict(value, value.district, scope),
    "Different client or district.",
  );
export const profileDistrictPrioritySchema = (
  clientId: string,
  scope: ProfileDistrictScope,
) =>
  priority.refine(
    (value) =>
      value.clientId === clientId && sameDistrict(value, value.district, scope),
    "Different client or district.",
  );

export type ProfileEconomicFootprint = z.infer<typeof footprint>;
export type ProfileDistrictEconomicContext = z.infer<typeof economicContext>;
export type ProfileDistrictStrategic = z.infer<typeof strategic>;
export type ProfileDistrictPriority = z.infer<typeof priority>;
