import { describe, expect, it } from "vitest";
import { defenseResearchOperations } from "../src/shared/capiro/operations/defense-research";
import {
  acquisitionDetail,
  fundingMatrix,
} from "../src/shared/capiro/operations/defense-research-schemas";
import {
  defenseProductCoverageOperations,
  productCoverage,
} from "../src/shared/capiro/operations/defense-product-coverage";

describe("native Research fixed Core boundaries", () => {
  it("uses only named Core read routes and rejects argument-borne authority or unowned effects", () => {
    for (const operation of Object.values({
      ...defenseResearchOperations,
      ...defenseProductCoverageOperations,
    })) {
      expect(operation.service).toBe("core");
      expect(operation.method).toBe("GET");
      expect(operation.path.startsWith("/defense-budget/")).toBe(true);
      expect(operation.source).toContain(
        operation.path === "/defense-budget/product-coverage"
          ? "b49f01017"
          : "f7b3c4401",
      );
    }
    const read = defenseResearchOperations["defenseResearch.offices"];
    expect(
      read.request.safeParse({ query: { page: 1, limit: 25 } }).success,
    ).toBe(true);
    for (const query of [
      { tenantId: "forged" },
      { includeSpeculative: true },
      { limit: 101 },
      { page: 0 },
    ]) {
      expect(read.request.safeParse({ query }).success).toBe(false);
    }
    expect(
      defenseResearchOperations["defenseResearch.dossier"].request.safeParse({
        params: { subjectType: "unknown", subjectId: "synthetic" },
      }).success,
    ).toBe(false);
    expect(
      defenseProductCoverageOperations[
        "defenseResearch.coverage"
      ].request.safeParse({ query: { recheck: true } }).success,
    ).toBe(false);
  });
  it("retains unknown physical denominators and strips private operator metadata", () => {
    const result = productCoverage.parse({
      projectionVersion: "test",
      filters: {},
      denominatorKnown: false,
      limitations: ["Expected corpus is not attested."],
      internalQueue: "must-not-release",
      rows: [
        {
          perimeter: "synthetic",
          component: null,
          account: null,
          family: "rdte",
          fiscalYear: 2027,
          edition: null,
          stage: "request",
          detail: null,
          asOf: "2026-10-27T00:00:00Z",
          denominator: {
            state: "unknown",
            value: null,
            unit: "physical_documents",
            reason: "Not attested",
            attestedAt: null,
          },
          discovered: 4,
          parsed: 3,
          qualified: 1,
          published: 0,
          outcome: "unknown",
          limitations: ["Partial source set"],
          adapterQueue: "private",
        },
      ],
    });
    expect(result.rows[0]?.denominator.value).toBeNull();
    expect(result.rows[0]?.outcome).toBe("unknown");
    expect(result.rows[0]?.published).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(
      /must-not-release|adapterQueue|internalQueue/,
    );
  });
  it("retains funding precision, missing versus zero, and each cell's source basis", () => {
    const cell = {
      basis: {
        requestEdition: "FY2027",
        fundingFiscalYear: 2028,
        stage: "request",
        metric: "funding",
        unit: "usd_millions",
        currency: "USD",
        priceBasis: null,
        knownAt: null,
        knowledgeTimeSupported: false,
      },
      value: "9007199254740993.000001",
      disposition: "observed",
      sourceObservationId: "synthetic-observation",
      replacedByObservationId: null,
      evidence: [],
    };
    const parsed = fundingMatrix.parse({
      subject: {
        type: "program_element",
        id: "synthetic-pe",
        label: "Synthetic PE",
      },
      projectionVersion: "defense-funding-matrix-v1",
      cells: [
        cell,
        { ...cell, value: null, disposition: "missing" },
        { ...cell, value: "0" },
      ],
      supported: {
        fiscalYears: [2028],
        editions: ["FY2027"],
        stages: ["request"],
        metrics: ["funding"],
        knownAt: false,
      },
      limitations: ["No arbitrary historical reconstruction"],
    });
    expect(parsed.cells.map((item) => item.value)).toEqual([
      "9007199254740993.000001",
      null,
      "0",
    ]);
    expect(parsed.cells[0]?.basis.fundingFiscalYear).toBe(2028);
    expect(parsed.cells[0]?.basis.requestEdition).toBe("FY2027");
  });
  it("strips acquisition raw source payloads from the mounted receiving shape", () => {
    const parsed = acquisitionDetail.parse({
      identityKey: "synthetic",
      sourceSystem: "sam",
      sourceRecordId: "example",
      recordKind: "notice",
      title: null,
      status: null,
      buyerOffice: null,
      postedAt: null,
      responseDeadline: null,
      validFrom: null,
      validTo: null,
      contentHash: "hash",
      sourceUrl: null,
      sourceVersion: null,
      sourceObservedAt: null,
      recordedAt: "today",
      textAvailability: "unavailable",
      amendmentCount: 0,
      openCoverageGaps: 1,
      revisions: [
        {
          id: "synthetic-revision",
          title: null,
          status: null,
          contentHash: "hash",
          sourceUrl: null,
          sourceVersion: null,
          sourceObservedAt: null,
          raw: { privateSource: "hidden" },
        },
      ],
      childIdentities: [],
      amendmentIdentities: [],
      associations: [],
    });
    expect(JSON.stringify(parsed)).not.toContain("privateSource");
    expect(parsed.openCoverageGaps).toBe(1);
  });
});
