import { describe, expect, it } from "vitest";
import {
  normalizeProfileDistrict,
  profileEconomicFootprintSchema,
  profileDistrictEconomicContextSchema,
  profileDistrictStrategicSchema,
  profileDistrictPrioritySchema,
} from "../src/features/portfolio/client-profile/profile-evidence-contracts";

const clientId = "10000000-0000-4000-8000-000000000001";
const district = { state: "VA", districtCode: "08" };
const instant = "2026-10-16T12:00:00Z";
const totals = {
  approvedEvidenceCount: 0,
  pendingEvidenceCount: 1,
  facilityCount: 0,
  employeeCount: null,
  payroll: null,
  capitalInvestment: null,
  taxes: null,
  supplierCount: 0,
  supplierSpend: null,
  partnerCount: 0,
  beneficiaryCount: null,
  projectSiteCount: 0,
};
const footprint = {
  clientId,
  districts: [],
  imports: [],
  evidence: [],
  coverage: { percent: 0, measured: [], missing: ["employees"] },
  totals,
  warnings: ["Synthetic incomplete evidence"],
  generatedAt: instant,
};
const economic = {
  districtKey: "VA-08",
  ...district,
  metrics: [
    {
      source: "acs",
      dataset: "Synthetic ACS 2024",
      sourceYear: 2024,
      boundaryCongress: 118,
      metricKey: "unemployment_rate_percent",
      value: null,
      unit: "percent",
      marginOfError: null,
      naicsCode: null,
      sourceRecordId: null,
      sourceUrl: null,
      observedAt: null,
      lastSyncedAt: instant,
    },
  ],
  sources: [
    {
      source: "acs",
      dataset: "Synthetic ACS 2024",
      sourceYear: 2024,
      boundaryCongress: 118,
      status: "failed",
      lastAttemptAt: instant,
      lastCompletedAt: null,
      rowsSeen: 0,
      rowsWritten: 0,
      rowsRejected: 0,
      error: "Synthetic failed source",
      annual: true,
    },
  ],
  warnings: ["Synthetic source unavailable"],
  generatedAt: instant,
};
const strategic = {
  clientId,
  clientName: null,
  districtKey: "VA-08",
  state: "VA",
  district: "08",
  memberBioguides: [],
  nexusStrength: null,
  strategicEnabled: true,
  strategic: {
    score: null,
    coveragePercent: 0,
    breakdown: [],
    evidence: [],
    missingComponents: ["committeeJurisdiction"],
    unavailableComponents: ["memberHistoricalPriorities"],
    strongestDrivers: [],
    freshness: [
      {
        source: "synthetic",
        label: "Synthetic source",
        lastSyncedAt: null,
        neverSynced: false,
        freshnessUnavailable: true,
      },
    ],
    conflicts: [{ code: "component_unavailable", message: "Synthetic gap" }],
    scoreVersion: "synthetic-score",
    weightsVersion: "synthetic-weights",
    minCoveragePercent: 20,
    computedAt: instant,
  },
};
const request = {
  requestId: "synthetic-request",
  chamber: "senate",
  requestType: "cds",
  fiscalYear: 2026,
  requesterName: "Synthetic member",
  recipientName: "Synthetic recipient",
  projectTitle: "Synthetic project",
  districtKey: null,
  geography: { basis: "senate_statewide", state: "VA" },
  requestedAmountUsd: 2000,
  finalAmountUsd: null,
  amountStageRaw: "Requested",
  appropriationsAccountRaw: null,
  sourceOccurrenceCount: 1,
  clientAttribution: null,
};
const priority = {
  clientId,
  clientName: "Synthetic client",
  districtKey: "VA-08",
  state: "VA",
  district: "08",
  member: {
    houseMemberBioguideIds: [],
    senatorBioguideIds: [],
    representation: "Synthetic",
  },
  nexusStrength: null,
  strategicRelevance: null,
  dataCoverage: null,
  priorityIntelligence: {
    cpfCds: {
      availability: {
        status: "loaded",
        reason: null,
        lastIngestRunAt: instant,
        loadedFiscalYears: [2026],
      },
      districtRequests: [request],
      clientRequests: [],
      memberHistoricalPriorities: [],
      warnings: [],
    },
    federalProperty: {
      availability: {
        status: "not_loaded",
        reason: "Synthetic missing data",
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: null,
      },
      detailedAssetCount: null,
      detailedSquareFeetTotal: null,
      summarizedInstallationCount: null,
      ownedCount: null,
      leasedCount: null,
      agenciesByAssetCount: [],
      fiscalYears: [],
      boundaryCongresses: [null],
      warnings: [],
    },
    sectorSignals: {
      availability: { status: "not_loaded", sources: [] },
      warnings: [],
    },
    recentChanges: [
      {
        changeKind: "synthetic",
        source: "synthetic",
        sourceRecordId: "synthetic-record",
        state: null,
        district: null,
        boundaryCongress: null,
        observedAt: instant,
        effectiveAt: null,
        sourceYear: 2024,
        geographyVintage: "118",
        severity: "info",
        oldValue: { unprojected: true },
        provenance: { unprojected: true },
      },
    ],
  },
  strongestPrioritySignals: [],
  missingPrioritySources: ["gsa"],
  freshness: [],
  geographyVintage: { boundaryCongress: null, conflict: false, detail: null },
  warnings: [],
  computedAt: instant,
};

describe("Profile evidence receiving subsets", () => {
  it("normalizes scoped district identity without inventing seats or sentinels", () => {
    expect(
      normalizeProfileDistrict({ state: " va ", districtCode: "8" }),
    ).toEqual(district);
    expect(
      normalizeProfileDistrict({ state: "VA", districtCode: "VA-08" }),
    ).toEqual(district);
    expect(
      normalizeProfileDistrict({ state: "WY", districtCode: "AL" }),
    ).toEqual({ state: "WY", districtCode: "00" });
    for (const code of ["MD-08", "90", "98", "ZZ", "", "../08"])
      expect(
        normalizeProfileDistrict({ state: "VA", districtCode: code }),
      ).toBeNull();
    expect(
      normalizeProfileDistrict({ state: null, districtCode: "08" }),
    ).toBeNull();
  });

  it("keeps client footprint quantities nullable and rejects another client", () => {
    const schema = profileEconomicFootprintSchema(clientId);
    const value = schema.parse(footprint);
    expect(value.totals.employeeCount).toBeNull();
    expect(value.totals.payroll).toBeNull();
    expect(value.totals.pendingEvidenceCount).toBe(1);
    expect(
      schema.safeParse({ ...footprint, clientId: "different" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...footprint, totals: { ...totals, payroll: "0" } })
        .success,
    ).toBe(false);
  });

  it("preserves public context vintage, failed-source status and missing values", () => {
    const schema = profileDistrictEconomicContextSchema(district);
    const value = schema.parse(economic);
    expect(value.metrics[0]).toMatchObject({
      sourceYear: 2024,
      boundaryCongress: 118,
      value: null,
    });
    expect(value.sources[0]).toMatchObject({
      status: "failed",
      lastCompletedAt: null,
      annual: true,
    });
    expect(
      schema.safeParse({ ...economic, districtKey: "VA-09" }).success,
    ).toBe(false);
    expect(schema.safeParse({ ...economic, state: "MD" }).success).toBe(false);
  });

  it("keeps strategic score separate from Nexus and unknown freshness explicit", () => {
    const schema = profileDistrictStrategicSchema(clientId, district);
    const value = schema.parse(strategic);
    expect(value.strategic.score).toBeNull();
    expect(value.nexusStrength).toBeNull();
    expect(value.strategic.freshness[0]).toMatchObject({
      freshnessUnavailable: true,
    });
    expect(
      schema.safeParse({ ...strategic, clientId: "different" }).success,
    ).toBe(false);
    expect(schema.safeParse({ ...strategic, district: "09" }).success).toBe(
      false,
    );
  });

  it("keeps projected CPF numbers, statewide/public attribution and recent-change limits", () => {
    const schema = profileDistrictPrioritySchema(clientId, district);
    const value = schema.parse(priority);
    expect(value.priorityIntelligence.cpfCds.clientRequests).toEqual([]);
    expect(value.priorityIntelligence.cpfCds.districtRequests[0]).toMatchObject(
      {
        requestedAmountUsd: 2000,
        finalAmountUsd: null,
        clientAttribution: null,
        geography: { basis: "senate_statewide", state: "VA" },
      },
    );
    expect(
      value.priorityIntelligence.federalProperty.detailedAssetCount,
    ).toBeNull();
    expect(value.priorityIntelligence.recentChanges[0]).not.toHaveProperty(
      "provenance",
    );
    expect(value.priorityIntelligence.recentChanges[0]).not.toHaveProperty(
      "oldValue",
    );
    const wrongAmount = {
      ...priority,
      priorityIntelligence: {
        ...priority.priorityIntelligence,
        cpfCds: {
          ...priority.priorityIntelligence.cpfCds,
          districtRequests: [{ ...request, requestedAmountUsd: "2000" }],
        },
      },
    };
    expect(schema.safeParse(wrongAmount).success).toBe(false);
    expect(schema.safeParse({ ...priority, district: "09" }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ ...priority, clientId: "different" }).success,
    ).toBe(false);
  });
});
