import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FacilityEconomicSections } from "../src/features/portfolio/client-profile/FacilityEconomicSections";
import type {
  ProfileDistrictEconomicContext,
  ProfileEconomicFootprint,
  ProfileEvidenceScope,
} from "../src/features/portfolio/client-profile/profile-evidence-contracts";

const state = vi.hoisted(() => ({
  footprint: {
    enabled: true,
    scopeAvailable: true,
    isPending: false,
    error: null as Error | null,
    data: undefined as ProfileEconomicFootprint | undefined,
  },
  district: {
    enabled: true,
    scopeAvailable: true,
    isPending: false,
    error: null as Error | null,
    data: undefined as ProfileDistrictEconomicContext | undefined,
  },
}));
vi.mock(
  "../src/features/portfolio/client-profile/profile-evidence-queries",
  () => ({
    useProfileEconomicFootprint: () => ({
      ...state.footprint,
      refetch: vi.fn(),
    }),
    useProfileDistrictEconomicContext: () => ({
      ...state.district,
      refetch: vi.fn(),
    }),
  }),
);
const scope: ProfileEvidenceScope = {
  clientId: "10000000-0000-4000-8000-000000000001",
  facilityId: "20000000-0000-4000-8000-000000000001",
  district: { state: "VA", districtCode: "01" },
};
const totals: ProfileEconomicFootprint["totals"] = {
  approvedEvidenceCount: 5,
  pendingEvidenceCount: 3,
  facilityCount: 2,
  employeeCount: 999999,
  payroll: null,
  capitalInvestment: null,
  taxes: null,
  supplierCount: 0,
  supplierSpend: null,
  partnerCount: 0,
  beneficiaryCount: null,
  projectSiteCount: 0,
};
const evidence: ProfileEconomicFootprint["evidence"][number] = {
  id: "site-evidence",
  importId: "synthetic-import",
  rowOrdinal: 2,
  evidenceType: "employee",
  subjectName: "Synthetic pending site evidence",
  subjectId: null,
  state: "VA",
  congressionalDistrict: "01",
  boundaryCongress: 119,
  numericValue: 25,
  unit: "people",
  currency: null,
  verificationStatus: "user_provided",
  reviewStatus: "pending_review",
  externalUseApproved: false,
  effectiveFrom: "2024-01-01",
  effectiveTo: "2024-12-31",
  observedAt: "2025-02-01T12:00:00Z",
  promotedFacilityId: scope.facilityId,
  createdAt: "2025-02-02T12:00:00Z",
  reviewedAt: null,
};
const footprint: ProfileEconomicFootprint = {
  clientId: scope.clientId,
  districts: [],
  imports: [],
  evidence: [evidence],
  coverage: { percent: 20, measured: ["employee"], missing: ["payroll"] },
  totals,
  warnings: ["Synthetic import coverage is incomplete"],
  generatedAt: "2026-10-16T12:00:00Z",
};
const metric: ProfileDistrictEconomicContext["metrics"][number] = {
  source: "acs",
  dataset: "synthetic_acs_5yr",
  sourceYear: 2023,
  boundaryCongress: 118,
  metricKey: "unemployment_rate_percent",
  value: 3.25,
  unit: "percent",
  marginOfError: 0.8,
  naicsCode: null,
  sourceRecordId: "synthetic-acs-record",
  sourceUrl: "https://example.test/synthetic-acs",
  observedAt: "2024-12-12T12:00:00Z",
  lastSyncedAt: "2025-01-02T12:00:00Z",
};
const sync: ProfileDistrictEconomicContext["sources"][number] = {
  source: "acs",
  dataset: "synthetic_acs_5yr",
  sourceYear: 2023,
  boundaryCongress: 118,
  status: "success_with_errors",
  lastAttemptAt: "2025-01-02T11:55:00Z",
  lastCompletedAt: "2025-01-02T12:00:00Z",
  rowsSeen: 5,
  rowsWritten: 4,
  rowsRejected: 1,
  error: "Synthetic internal diagnostic must not be displayed",
  annual: true,
};
const context: ProfileDistrictEconomicContext = {
  districtKey: "VA-01",
  state: "VA",
  districtCode: "01",
  metrics: [metric],
  sources: [sync],
  warnings: ["Synthetic district source coverage is partial"],
  generatedAt: "2026-10-16T12:01:00Z",
};
const render = (open = true, value = scope) =>
  renderToStaticMarkup(
    createElement(FacilityEconomicSections, {
      scope: value,
      open,
      ids: {
        economic: "location-economic",
        unemployment: "location-unemployment",
        workforce: "location-workforce",
      },
    }),
  );
beforeEach(() => {
  Object.assign(state.footprint, {
    enabled: true,
    scopeAvailable: true,
    isPending: false,
    error: null,
    data: footprint,
  });
  Object.assign(state.district, {
    enabled: true,
    scopeAvailable: true,
    isPending: false,
    error: null,
    data: context,
  });
});

describe("Location economic evidence and district context", () => {
  it("attributes only explicitly promoted location evidence and keeps review and external-use status independent", () => {
    state.footprint.data = {
      ...footprint,
      evidence: [
        evidence,
        {
          ...evidence,
          id: "other-site",
          promotedFacilityId: "other",
          subjectName: "Other site must stay hidden",
        },
        {
          ...evidence,
          id: "district-only",
          promotedFacilityId: null,
          subjectName: "Unlinked district evidence must stay hidden",
        },
        {
          ...evidence,
          id: "approved",
          subjectName: "Approved private site evidence",
          reviewStatus: "approved",
          externalUseApproved: false,
        },
        {
          ...evidence,
          id: "rejected",
          subjectName: "Rejected site evidence",
          reviewStatus: "rejected",
          externalUseApproved: true,
        },
      ],
    };
    const html = render();
    expect(html).toContain(evidence.subjectName);
    expect(html).toContain("Approved private site evidence");
    expect(html).toContain("Rejected site evidence");
    expect(html).toContain("pending review");
    expect(html).toContain("rejected");
    expect(html).toContain("Not approved");
    expect(html).toContain("user provided");
    expect(html).not.toContain("Other site must stay hidden");
    expect(html).not.toContain("Unlinked district evidence must stay hidden");
    expect(html).not.toContain("999999");
    expect(html).toContain("not a period-complete history");
    for (const value of [
      evidence.id,
      evidence.importId,
      evidence.effectiveFrom,
      evidence.effectiveTo,
      evidence.observedAt,
    ])
      expect(html).toContain(value);
  });

  it("preserves every returned ACS unemployment vintage, source period, unit, MOE and sync facts", () => {
    state.district.data = {
      ...context,
      metrics: [
        metric,
        { ...metric, sourceYear: 2022, value: 0, marginOfError: null },
        {
          ...metric,
          metricKey: "other_metric_not_unemployment",
          value: 888888,
        },
      ],
    };
    const html = render();
    for (const value of [
      "2023",
      "2022",
      "3.25",
      "0.8",
      "percent",
      "Margin of error",
      "Rows rejected",
      "success with errors",
      metric.lastSyncedAt,
      metric.observedAt,
      metric.sourceUrl,
    ])
      expect(html).toContain(value);
    expect(html).toMatch(/>0<\/strong>/);
    expect(html).not.toContain("888888");
    expect(html).not.toContain(sync.error);
    expect(html).toContain("This source reported an error.");
    expect(html).toContain(
      "They do not establish facility employment or local hiring.",
    );
  });

  it("renders actual LODES rows and reports missing LODES separately from available ACS data", () => {
    const empty = render();
    expect(empty).toContain("Workforce and commuting measures are unavailable");
    expect(empty).toContain("No LODES source sync status was returned.");
    state.district.data = {
      ...context,
      metrics: [
        metric,
        {
          ...metric,
          source: "lodes",
          dataset: "synthetic_lodes",
          sourceYear: 2021,
          metricKey: "district_workplace_jobs",
          unit: "jobs",
          value: 0,
        },
      ],
      sources: [
        sync,
        {
          ...sync,
          source: "lodes",
          dataset: "synthetic_lodes",
          sourceYear: 2021,
          status: "unavailable",
          error: null,
        },
      ],
    };
    const html = render();
    expect(html).toContain("district workplace jobs");
    expect(html).toContain("2021");
    expect(html).toContain("jobs");
    expect(html).toMatch(/>0<\/strong>/);
    expect(html).toContain("unavailable");
    expect(html).not.toContain(
      "Workforce and commuting measures are unavailable",
    );
  });

  it("shows explicit missing evidence and null metric values rather than synthetic totals or zero", () => {
    state.footprint.data = { ...footprint, evidence: [] };
    state.district.data = { ...context, metrics: [{ ...metric, value: null }] };
    const html = render();
    expect(html).toContain(
      "No returned economic evidence is explicitly linked",
    );
    expect(html).toContain("Not available");
    expect(html).not.toMatch(/>0<\/strong>/);
  });

  it("keeps client and district loading/error states independent and removes failed-source facts", () => {
    state.footprint.error = new Error(
      "Synthetic current client evidence failure",
    );
    const failed = render();
    expect(failed).toContain("Synthetic current client evidence failure");
    expect(failed).toContain("Retry");
    expect(failed).not.toContain(evidence.subjectName);
    expect(failed).toContain("3.25");
    Object.assign(state.footprint, {
      error: null,
      isPending: true,
      data: undefined,
    });
    Object.assign(state.district, {
      error: new Error("Synthetic district evidence failure"),
      data: context,
    });
    const loading = render();
    expect(loading).toContain('role="status"');
    expect(loading).toContain("Synthetic district evidence failure");
    expect(loading).not.toContain("3.25");
  });

  it("does not show stale cached values or perpetual loading while scope/session is unavailable or dialog is closed", () => {
    Object.assign(state.footprint, { enabled: false, isPending: true });
    Object.assign(state.district, {
      enabled: false,
      scopeAvailable: false,
      isPending: true,
    });
    const html = render(true, { ...scope, district: null });
    expect(html).toContain(
      "A current session and matching client/location scope are required.",
    );
    expect(html).toContain("A resolved location district is required");
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain(evidence.subjectName);
    expect(html).not.toContain("3.25");
    expect(render(false)).toBe("");
  });
});
