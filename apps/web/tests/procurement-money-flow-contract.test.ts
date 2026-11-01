import type {
  ProcurementHubSummary,
  ProcurementMoneyFlow,
} from "@capiro/shared";
import { describe, expect, it } from "vitest";
import {
  procurementHubSummary,
  procurementMoneyFlow,
  procurementOperations,
  procurementScope,
} from "../src/shared/capiro/operations/procurement-money-flow";

const key = "usaspending|award|CONT_AWD_000123_9700_-NONE-_-NONE-";
const otherKey = "usaspending|award|CONT_AWD_000123_1700_PARENT9_9700";
const instant = "2026-11-01T12:00:00.123456Z";
const selectedMeasure = {
  actions: "2",
  obligationUsd: "-9007199254740993.000001",
  outlayUsd: null,
  obligationKnown: "2",
  outlayKnown: "0",
};
function fixture(): ProcurementMoneyFlow {
  return {
    contract: "defproc-scoped-money-flow/v1",
    state: "partial",
    measure: "qualified_observed_actions",
    currency: "USD",
    knownAt: instant,
    sourceThrough: instant,
    scope: { awardIdentityKeys: [key, otherKey], includesDescendants: false },
    totals: { ...selectedMeasure },
    coverage: { selected: "2", legacy: "4", source_revision_fork: "1" },
    groups: [
      {
        ...selectedMeasure,
        fiscalYear: 2027,
        awardingAgency: "Synthetic Department",
        awardingSubTier: "Synthetic Agency",
        contractorName: "Synthetic Vendor",
        recipientUei: "SYNTHETIC123",
        vendorIdentityState: "source_uei",
        vendorKey: "uei:SYNTHETIC123",
        attributeState: "latest_known_catalog_observation",
        latestSourceRevision: instant,
        latestSourceObservedAt: instant,
        latestRecordedAt: instant,
        latestAttributeRecordedAt: instant,
      },
    ],
    provenance: [
      {
        awardIdentityKey: key,
        contract: "sam-contract-action/v2",
        producerCommit: "a".repeat(40),
        imageDigest: `sha256:${"b".repeat(64)}`,
        runId: "synthetic-run",
        targetId: "synthetic-target",
        selectedActions: "2",
        sourceUrl: "https://api.sam.gov/contract-awards/v1/search",
        catalogRevisionId: "10000000-0000-4000-8000-000000000001",
        catalogSourceUrl:
          "https://www.usaspending.gov/award/CONT_AWD_000123_9700_-NONE-_-NONE-",
        attributeRecordedAt: instant,
      },
    ],
    sources: [
      {
        system: "sam_gov",
        documentationUrl: "https://open.gsa.gov/api/contract-awards/",
        semantics: "Qualified observed actions; no reported outlays",
      },
      {
        system: "usaspending",
        documentationUrl: "https://www.usaspending.gov/",
        semantics: "Latest known source-reported award attributes",
      },
    ],
  };
}
function summary(value = fixture()): ProcurementHubSummary {
  const { groups, ...rest } = value;
  return { ...rest, groupCount: groups.length };
}
function unavailable(): ProcurementMoneyFlow {
  return {
    ...fixture(),
    state: "unavailable",
    totals: null,
    groups: [],
    provenance: [],
    coverage: { legacy: "4" },
  };
}
function expectInvalid(value: unknown) {
  expect(() => procurementMoneyFlow.safeParse(value)).not.toThrow();
  expect(procurementMoneyFlow.safeParse(value).success).toBe(false);
}

describe("finite procurement read contracts", () => {
  it("uses fixed authenticated Core POST reads with strict body-only scope", () => {
    expect(
      Object.values(procurementOperations).map((operation) => operation.path),
    ).toEqual([
      "/defense-budget/procurement/money-flow",
      "/hub/procurement/summary",
    ]);
    for (const operation of Object.values(procurementOperations)) {
      expect(operation.service).toBe("core");
      expect(operation.method).toBe("POST");
      expect(operation.authentication).toBeUndefined();
      expect(operation.idempotency).toBeUndefined();
      expect(operation.source).toContain(
        "f326ba7926606a6c5810c7608b627637bdf3092d",
      );
      expect(
        operation.request.parse({ body: { awardIdentityKeys: [key] } }),
      ).toEqual({ body: { awardIdentityKeys: [key] } });
      const extraFields = [
        { tenantId: "forged" },
        { headers: { authorization: "forged" } },
        { query: {} },
        { idempotencyKey: "forged-key" },
        { userId: "forged" },
        { role: "admin" },
        { includesDescendants: true },
        { piid: "000123" },
      ];
      for (const extra of extraFields) {
        const body = { awardIdentityKeys: [key] };
        expect(operation.request.safeParse({ body, ...extra }).success).toBe(
          false,
        );
        expect(
          operation.request.safeParse({ body: { ...body, ...extra } }).success,
        ).toBe(false);
      }
    }
  });

  it("preserves numeric and leading-zero PIIDs plus complete agency/parent identity", () => {
    const value = {
      awardIdentityKeys: [key, otherKey],
      knownAt: instant,
      sourceThrough: instant,
    };
    expect(procurementScope.parse(value)).toEqual(value);
    expect(
      procurementScope.safeParse({
        awardIdentityKeys: Array.from({ length: 25 }, (_, index) =>
          key.replace("000123", String(index)),
        ),
      }).success,
    ).toBe(true);
    for (const keys of [
      [],
      [key, key],
      Array.from({ length: 26 }, (_, index) =>
        key.replace("000123", String(index)),
      ),
      ["000123"],
      [key.replace("9700_-NONE-_-NONE-", "9700_PARENT_-NONE-")],
      [key.toLowerCase()],
      [key.replace("CONT_AWD_", "CONT_IDV_")],
      [key.replace("000123", "%30%30%30%31%32%33")],
      [key.replace("000123", "A".repeat(513))],
    ])
      expect(
        procurementScope.safeParse({ awardIdentityKeys: keys }).success,
      ).toBe(false);
  });

  it("requires real UTC microsecond clocks without converting or truncating them", () => {
    for (const knownAt of [
      "2026-02-30T12:00:00.000000Z",
      "2026-11-01T24:00:00.000000Z",
      "2026-11-01T12:00:00.123Z",
      "2026-11-01T12:00:00.123456+00:00",
      "0000-01-01T00:00:00.000000Z",
      "2026-11-01",
    ])
      expect(
        procurementScope.safeParse({ awardIdentityKeys: [key], knownAt })
          .success,
      ).toBe(false);
    expect(
      procurementScope.parse({
        awardIdentityKeys: [key],
        knownAt: "2024-02-29T23:59:59.999999Z",
      }).knownAt,
    ).toBe("2024-02-29T23:59:59.999999Z");
  });
});

describe("safe selected money and provenance", () => {
  it("retains negative high precision money, explicit NULL outlays, and counts beyond safe integers", () => {
    const value = fixture();
    const actions = "9007199254740993";
    value.totals!.actions = value.totals!.obligationKnown = actions;
    value.groups[0]!.actions = value.groups[0]!.obligationKnown = actions;
    value.coverage = { ...value.coverage, selected: actions };
    value.provenance[0]!.selectedActions = actions;
    const parsed = procurementMoneyFlow.parse(value);
    expect(parsed.totals).toEqual(value.totals);
    expect(parsed.totals!.obligationUsd).toBe("-9007199254740993.000001");
    expect(parsed.totals!.outlayUsd).toBeNull();
    expect(procurementHubSummary.parse(summary(value)).groupCount).toBe(1);
  });

  it("checks aggregation exactly across signs and decimal scales", () => {
    const value = fixture();
    value.groups = ["9007199254740993.000001", "-9007199254740993.00"].map(
      (obligationUsd, index) => ({
        ...value.groups[0]!,
        actions: "1",
        obligationKnown: "1",
        obligationUsd,
        fiscalYear: 2027 - index,
      }),
    );
    value.totals!.obligationUsd = "0.000001";
    expect(procurementMoneyFlow.parse(value).totals!.obligationUsd).toBe(
      "0.000001",
    );
    value.totals!.obligationUsd = "0.00";
    expectInvalid(value);
  });

  it("accepts unavailable without manufacturing zero totals, while partial requires selected evidence", () => {
    expect(procurementMoneyFlow.parse(unavailable()).totals).toBeNull();
    expect(procurementHubSummary.parse(summary(unavailable())).groupCount).toBe(
      0,
    );
    for (const changes of [
      { totals: fixture().totals },
      { groups: fixture().groups },
    ])
      expectInvalid({ ...unavailable(), ...changes });
    for (const changes of [
      { totals: null },
      { groups: [] },
      { provenance: [] },
    ])
      expectInvalid({ ...fixture(), ...changes });
    expect(
      procurementHubSummary.safeParse({ ...summary(), groupCount: 0 }).success,
    ).toBe(false);
    expect(
      procurementHubSummary.safeParse({
        ...summary(unavailable()),
        groupCount: 1,
      }).success,
    ).toBe(false);
  });

  it.each([
    9007199254740993,
    "NaN",
    "Infinity",
    "1e5",
    "+1.00",
    "01.00",
    "1,000.00",
    "-0.00",
    "0.",
    "1".repeat(129),
  ])("rejects malformed or coerced money %s", (amount) => {
    const value = fixture();
    expectInvalid({
      ...value,
      totals: { ...value.totals, obligationUsd: amount },
    });
  });

  it("rejects bigint overflow, corrupt known counts, manufactured outlays and inconsistent totals", () => {
    for (const changes of [
      { actions: "9223372036854775808" },
      { actions: 2 },
      { actions: "01" },
      { actions: "x" },
      { obligationKnown: "3" },
      { obligationKnown: "0" },
      { obligationUsd: null },
      { outlayUsd: "0.00" },
      { outlayKnown: "1" },
    ])
      expectInvalid({
        ...fixture(),
        totals: { ...fixture().totals, ...changes },
      });
    expectInvalid({ ...fixture(), coverage: { selected: "1" } });
    const value = fixture();
    value.groups[0]!.actions = "1";
    expectInvalid(value);
  });

  it("does not consolidate unresolved vendors by matching display names", () => {
    const value = fixture();
    value.groups = [key, otherKey].map((award, index) => ({
      ...value.groups[0]!,
      recipientUei: null,
      vendorIdentityState: "unresolved",
      vendorKey: `award:${award}`,
      actions: "1",
      obligationKnown: "1",
      obligationUsd: `${index + 1}.00`,
    }));
    value.totals!.obligationUsd = "3.00";
    expect(
      procurementMoneyFlow.parse(value).groups.map((row) => row.vendorKey),
    ).toEqual([`award:${key}`, `award:${otherKey}`]);
    value.groups[1]!.vendorKey = "name:Synthetic Vendor";
    expectInvalid(value);
    for (const changes of [
      { recipientUei: "synthetic123" },
      { vendorKey: "uei:OTHERUEI1234" },
      { vendorIdentityState: "unresolved" },
    ])
      expectInvalid({
        ...fixture(),
        groups: [{ ...fixture().groups[0]!, ...changes }],
      });
  });

  it("retains absent attributes and rejects fabricated catalog or source chronology", () => {
    const value = fixture();
    value.groups = [
      {
        ...value.groups[0]!,
        awardingAgency: null,
        awardingSubTier: null,
        contractorName: null,
        recipientUei: null,
        vendorIdentityState: "unresolved",
        vendorKey: `award:${key}`,
        attributeState: "missing_catalog_attributes",
        latestAttributeRecordedAt: null,
      },
    ];
    value.provenance = [
      {
        ...value.provenance[0]!,
        catalogRevisionId: null,
        catalogSourceUrl: null,
        attributeRecordedAt: null,
      },
    ];
    expect(procurementMoneyFlow.safeParse(value).success).toBe(true);
    expectInvalid({
      ...value,
      groups: [{ ...value.groups[0]!, contractorName: "Invented" }],
    });
    for (const field of [
      "latestRecordedAt",
      "latestAttributeRecordedAt",
      "latestSourceRevision",
    ])
      expectInvalid({
        ...fixture(),
        groups: [
          { ...fixture().groups[0]!, [field]: "2026-11-01T12:00:00.123457Z" },
        ],
      });
  });

  it("requires exact in-scope provenance and safe source links, refusing endpoint errors", () => {
    for (const changes of [
      { awardIdentityKey: key.replace("000123", "OTHER") },
      { selectedActions: "1" },
      { producerCommit: "branch-name" },
      { imageDigest: "latest" },
      { contract: "legacy/v1" },
      { catalogRevisionId: null },
      { sourceUrl: "javascript:alert(1)" },
      { sourceUrl: "https://user:password@example.com" },
      { raw_jsonb: {} },
    ])
      expectInvalid({
        ...fixture(),
        provenance: [{ ...fixture().provenance[0]!, ...changes }],
      });
    for (const error of [
      { statusCode: 403, message: "Forbidden" },
      { statusCode: 503, message: "Unavailable" },
      null,
      {},
    ])
      expectInvalid(error);
    expectInvalid({
      ...fixture(),
      scope: { awardIdentityKeys: [key], includesDescendants: true },
    });
    expectInvalid({
      ...fixture(),
      sources: [...fixture().sources, fixture().sources[0]],
    });
  });

  it("bounds groups, provenance, and total response bytes", () => {
    for (const field of ["groups", "provenance"] as const)
      expectInvalid({
        ...fixture(),
        [field]: Array(501).fill(fixture()[field][0]),
      });
    expect(
      procurementHubSummary.safeParse({ ...summary(), groupCount: 501 })
        .success,
    ).toBe(false);
    const value = fixture();
    value.totals!.actions =
      value.totals!.obligationKnown =
      value.groups[0]!.actions =
      value.groups[0]!.obligationKnown =
        "500";
    value.coverage = { selected: "500" };
    value.provenance = Array.from({ length: 500 }, (_, index) => ({
      ...value.provenance[0]!,
      selectedActions: "1",
      runId: `synthetic-${index}`,
      sourceUrl: `https://example.gov/${"a".repeat(2500)}`,
    }));
    expectInvalid(value);
    expect(procurementHubSummary.safeParse(summary(value)).success).toBe(false);
  });
});
