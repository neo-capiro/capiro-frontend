import { describe, expect, it } from "vitest";
import { directoryOperations } from "./directory";
import { intelligenceDefenseOperations } from "./intelligence-defense";
import {
  fundingDateFact,
  intelligenceFundingOperations,
} from "./intelligence-funding";
import { researchPortfolioOperations } from "./research-portfolios";
import { researchAnalytics } from "./research-schemas";
const id = "c301b67c-2b12-4b7b-aac3-376eaa18f142";
describe("Modules source contracts", () => {
  it("joins the configured service prefix exactly once", () => {
    for (const operation of Object.values({
      ...directoryOperations,
      ...intelligenceFundingOperations,
      ...intelligenceDefenseOperations,
      ...researchPortfolioOperations,
    })) {
      expect(operation.path.startsWith("/api/")).toBe(false);
      expect(operation.source).not.toBe("");
    }
  });
  it("preserves canonical source identity and missing funding independently from zero", () => {
    const parsed = intelligenceFundingOperations[
      "intelligence.funding.search"
    ].response.parse({
      opportunities: [
        {
          id: "source-record",
          source: "sam_gov",
          sourceRecordId: "notice-actual",
          title: "Source notice",
          agency: null,
          sourceUrl: null,
          type: "contract",
          lifecycle: "active",
          postedDate: null,
          deadline: null,
          closeOrArchiveDate: null,
          isPursuable: false,
          summary: null,
          value: 0,
          valueBasis: "source_backed",
          sourceFacts: { provenance: "sam_gov" },
          relevanceScore: null,
          eligibility: null,
          clientId: null,
        },
      ],
      page: 1,
      pageSize: 25,
      total: null,
      totalIsCapped: true,
      catalogComplete: false,
      counts: { grants: null, contracts: null, active: null, closed: null },
      emptyReason: null,
      generatedAt: "2026-10-11T00:00:00Z",
      freshness: [],
    });
    expect(parsed.opportunities[0]?.value).toBe(0);
    expect(parsed.opportunities[0]?.deadline).toBeNull();
    expect(parsed.total).toBeNull();
    expect(parsed.opportunities[0]?.sourceRecordId).toBe("notice-actual");
  });
  it("retains source date precision and timezone instead of manufacturing a deadline time", () => {
    expect(
      fundingDateFact.parse({
        value: "2026-11-02",
        precision: "date",
        timezone: null,
        sourceRaw: "11/02/2026",
        unavailableReason: null,
      }),
    ).toEqual({
      value: "2026-11-02",
      precision: "date",
      timezone: null,
      sourceRaw: "11/02/2026",
      unavailableReason: null,
    });
  });
  it("refuses tenant or actor authority fields in research writes and requires revisions", () => {
    const request = researchPortfolioOperations["research.update"].request;
    expect(
      request.safeParse({
        params: { id },
        body: {
          name: "Updated",
          idempotencyKey: "key",
          expectedRevision: 4,
          tenantId: id,
        },
      }).success,
    ).toBe(false);
    expect(
      request.safeParse({
        params: { id },
        body: { name: "Updated", idempotencyKey: "key" },
      }).success,
    ).toBe(false);
    expect(
      request.safeParse({
        params: { id },
        body: { name: "Updated", idempotencyKey: "key", expectedRevision: 4 },
      }).success,
    ).toBe(true);
  });
  it("allows current geography only and never admits future metrics as current", () => {
    expect(
      intelligenceDefenseOperations[
        "intelligence.district.map"
      ].request.safeParse({ query: { view: "future" } }).success,
    ).toBe(false);
    expect(
      intelligenceDefenseOperations[
        "intelligence.district.map"
      ].request.safeParse({ query: { view: "current" } }).success,
    ).toBe(true);
  });
  it("keeps financial bases distinct and decimal strings exact", () => {
    const basis = {
      requestEdition: "PB27",
      fundingFiscalYear: 2027,
      stage: "request",
      metric: "funding",
      unit: "usd_millions",
      currency: "USD",
      priceBasis: null,
      knownAt: null,
    };
    const parsed = researchAnalytics.parse({
      portfolioId: id,
      portfolioRevision: 2,
      availability: "partial",
      totals: [
        { basis, value: "12345678901234567890.001", contributionCount: 1 },
        {
          basis: { ...basis, stage: "enacted" },
          value: "0",
          contributionCount: 2,
        },
      ],
      coverage: {
        eligibleMembers: 3,
        supportedMembers: 3,
        includedContributions: 3,
        excludedContributions: 0,
        overlapContributions: 0,
        unavailableMembers: 0,
      },
      limitations: ["Two incompatible stage bases."],
      observedAt: "2026-10-11T00:00:00Z",
    });
    expect(parsed.totals).toHaveLength(2);
    expect(parsed.totals[0]?.value).toBe("12345678901234567890.001");
    expect(parsed.totals[1]?.value).toBe("0");
  });
});
