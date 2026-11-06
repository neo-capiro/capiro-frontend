import { describe, expect, it } from "vitest";
import nativeAccounts from "./fixtures/procurement-account-reports-native.json";
import originalAccounts from "./fixtures/procurement-account-reports-source.json";
import type { OperationRegistry } from "../src/shared/capiro/contracts";
import { procurementOperations } from "../src/shared/capiro/operations/procurement";

const first = "usaspending|award|CONT_AWD_0001_2100_-NONE-_-NONE-";
const second = "usaspending|award|CONT_AWD_0001_9700_-NONE-_-NONE-";
function observation() {
  return {
    awardIdentityKey: first,
    state: "reported",
    snapshotId: "10000000-0000-4000-8000-000000000001",
    sourceObservedAt: "2026-11-01T00:00:00.000000Z",
    recordedAt: "2026-11-01T00:00:01.000000Z",
    sourcePayloadSha256: "a".repeat(64),
    sourceUrl: `https://www.usaspending.gov/award/${first.slice(18)}`,
    rows: [
      {
        sourceRowIndex: 0,
        federalAccount: "017-1804",
        accountTitle: "Synthetic account",
        treasuryAccountSymbol: null,
        programActivityCode: "0004",
        programActivityName: null as string | null,
        objectClass: "25.1",
        objectClassName: null,
        disasterEmergencyFundCode: "Q",
        fundingAgencyName: "Synthetic funding agency",
        awardingAgencyName: "Synthetic awarding agency",
        reportingFiscalYear: 2024,
        reportingFiscalQuarter: 4,
        reportingFiscalMonth: 12,
        isQuarterlySubmission: false,
        reportedObligationUsd: "-1700000.00",
        reportedGrossOutlayUsd: null,
      },
    ],
  };
}
function payload() {
  return {
    contract: "defproc-account-reports/v1",
    knownAt: "2026-11-01T00:00:02.000000Z",
    scope: { awardIdentityKeys: [first], includesDescendants: false },
    coverage: "source_reported_rows_only",
    reports: [observation()],
  };
}
function operation() {
  const found = (procurementOperations as OperationRegistry)[
    "procurement.accountReports"
  ];
  expect(
    found,
    "The account-report read must be registered through the procurement family",
  ).toBeDefined();
  if (!found) throw new Error("Account report operation missing");
  return { ...found, response: found.response };
}

describe("independent source account reporting contract", () => {
  it("admits native SQL responses, including all retained original-source rows", () => {
    for (const value of [nativeAccounts, originalAccounts]) {
      expect(operation().response.parse(value)).toEqual(value);
    }
    expect(
      originalAccounts.reports.reduce(
        (count, report) => count + report.rows.length,
        0,
      ),
    ).toBe(82);
  });

  it("preserves source decimal precision without padding or rounding", () => {
    for (const amount of [
      "1700000",
      "1700000.0",
      "-0.000001",
      "9007199254740993.123456",
    ]) {
      const value = payload();
      value.reports[0]!.rows[0]!.reportedObligationUsd = amount;
      expect(operation().response.parse(value)).toEqual(value);
    }
  });
  it("uses the authenticated fixed read route and preserves signed/null source values", () => {
    const op = operation();
    expect(op.method).toBe("POST");
    expect(op.path).toBe("/defense-budget/procurement/account-reports");
    expect(op.service).toBe("core");
    expect(op.timeoutMs).toBe(20_000);
    expect(
      op.request.safeParse({ body: { awardIdentityKeys: [first] } }).success,
    ).toBe(true);
    const value = payload();
    expect(op.response.parse(value)).toEqual(value);
  });
  it("does not accept SAM cutoff flags or arbitrary requests on the account read", () => {
    for (const extension of [
      { sourceThrough: payload().knownAt },
      { includeActionDetails: true },
      { clientId: "x" },
    ]) {
      expect(
        operation().request.safeParse({
          body: { awardIdentityKeys: [first], ...extension },
        }).success,
      ).toBe(false);
    }
  });
  it("retains duplicate-looking source rows rather than collapsing federal-account grain", () => {
    const value = payload();
    value.reports[0]!.rows.push({
      ...value.reports[0]!.rows[0]!,
      sourceRowIndex: 1,
      reportedObligationUsd: "0.00",
    });
    expect(operation().response.parse(value)).toEqual(value);
  });
  it.each([
    [
      "binary money",
      (v: ReturnType<typeof payload>) => {
        Object.assign(v.reports[0]!.rows[0]!, { reportedObligationUsd: 17 });
      },
    ],
    [
      "invented TAS",
      (v: ReturnType<typeof payload>) => {
        Object.assign(v.reports[0]!.rows[0]!, {
          treasuryAccountSymbol: "017-1804",
        });
      },
    ],
    [
      "missing receipt",
      (v: ReturnType<typeof payload>) => {
        Object.assign(v.reports[0]!, { sourcePayloadSha256: null });
      },
    ],
    [
      "wrong source award",
      (v: ReturnType<typeof payload>) => {
        v.reports[0]!.sourceUrl = `https://www.usaspending.gov/award/${second.slice(18)}`;
      },
    ],
    [
      "unknown scope",
      (v: ReturnType<typeof payload>) => {
        v.scope.awardIdentityKeys = [second];
      },
    ],
    [
      "duplicate reports",
      (v: ReturnType<typeof payload>) => {
        v.reports.push(structuredClone(v.reports[0]!));
      },
    ],
    [
      "future knowledge",
      (v: ReturnType<typeof payload>) => {
        v.reports[0]!.recordedAt = "2026-11-02T00:00:00.000000Z";
      },
    ],
    [
      "invalid calendar date",
      (v: ReturnType<typeof payload>) => {
        v.reports[0]!.sourceObservedAt = "2026-02-30T00:00:00.000000Z";
      },
    ],
    [
      "fabricated total",
      (v: ReturnType<typeof payload>) => {
        Object.assign(v, { totalOutlays: "1700000.00" });
      },
    ],
    [
      "row omission",
      (v: ReturnType<typeof payload>) => {
        v.reports[0]!.rows[0]!.sourceRowIndex = 1;
      },
    ],
    [
      "unknown field",
      (v: ReturnType<typeof payload>) => {
        Object.assign(v.reports[0]!.rows[0]!, { fake: true });
      },
    ],
  ])("refuses %s without silently repairing the source", (_name, mutate) => {
    const value = payload();
    expect(operation().response.safeParse(value).success).toBe(true);
    mutate(value);
    expect(operation().response.safeParse(value).success).toBe(false);
  });
  it("separates missing observations from a genuinely empty source response", () => {
    const value = payload();
    value.reports[0]!.rows = [];
    expect(operation().response.safeParse(value).success).toBe(true);
    Object.assign(value.reports[0]!, { state: "unavailable" });
    expect(operation().response.safeParse(value).success).toBe(false);
    Object.assign(value.reports[0]!, {
      snapshotId: null,
      sourceObservedAt: null,
      recordedAt: null,
      sourcePayloadSha256: null,
    });
    expect(operation().response.safeParse(value).success).toBe(true);
    Object.assign(value.reports[0]!, { state: "conflict" });
    expect(operation().response.safeParse(value).success).toBe(true);
  });
  it("limits rows and the full UTF8 response, not character count or a single table", () => {
    const value = payload();
    value.reports[0]!.rows = Array.from(
      { length: 100 },
      (_, sourceRowIndex) => ({
        ...observation().rows[0]!,
        sourceRowIndex,
        accountTitle: "é".repeat(2048),
        programActivityName: "é".repeat(2048),
      }),
    );
    expect(operation().response.safeParse(value).success).toBe(true);
    value.reports.push({
      ...structuredClone(value.reports[0]!),
      awardIdentityKey: second,
      snapshotId: "10000000-0000-4000-8000-000000000002",
      sourceUrl: `https://www.usaspending.gov/award/${second.slice(18)}`,
    });
    value.scope.awardIdentityKeys.push(second);
    const text = JSON.stringify(value);
    expect(text.length).toBeLessThan(1_048_576);
    expect(new TextEncoder().encode(text).byteLength).toBeGreaterThan(
      1_048_576,
    );
    const parsed = operation().response.safeParse(value);
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "Account report response exceeds one MiB",
          }),
        ]),
      );
    const tooMany = payload();
    tooMany.reports[0]!.rows = Array.from(
      { length: 101 },
      (_, sourceRowIndex) => ({ ...observation().rows[0]!, sourceRowIndex }),
    );
    expect(operation().response.safeParse(tooMany).success).toBe(false);
  });
});
