import { describe, expect, it } from "vitest";
import {
  materialChangesSchema,
  watchCoverageSchema,
} from "../src/features/portfolio/bill-tracker/tracker-metrics-contracts";
import {
  metricClient,
  materialFixture,
  coverageFixture,
  coveredFixture,
} from "./tracker-metrics-fixtures";
describe("saved Tracker material-change receiving", () => {
  it.each(["core", "intelligence"] as const)(
    "accepts complete zero from selected %s owner",
    (backend) => {
      expect(
        materialChangesSchema(metricClient, backend).parse(
          materialFixture(backend),
        ).count,
      ).toBe(0);
    },
  );
  it("accepts positive distinct count with a retained event in the fixed window", () => {
    const value = {
      ...materialFixture(),
      count: 2,
      sourceObservedAt: "2026-10-20T00:00:00.000Z",
    };
    expect(
      materialChangesSchema(metricClient, "intelligence").parse(value).count,
    ).toBe(2);
  });
  it.each([
    { clientId: "other" },
    { backend: "core" },
    { count: -1 },
    { count: 0.5 },
    { count: 1 },
    { complete: false },
    { capped: true },
    { version: 2 },
    { metric: "unread" },
    { sourceObservedAt: "2026-10-20T00:00:00.000Z" },
    { asOf: "2026-10-30T12:00:00.000Z" },
    { observedAt: "2026-10-30T12:00:00.000Z" },
    { count: 1, sourceObservedAt: "2026-10-31T12:00:00.000Z" },
    { count: 1, sourceObservedAt: "2026-10-09T12:00:00.000Z" },
  ])("rejects incomplete, foreign or inconsistent aggregate %j", (patch) => {
    expect(
      materialChangesSchema(metricClient, "intelligence").safeParse({
        ...materialFixture(),
        ...patch,
      }).success,
    ).toBe(false);
  });
  it("rejects another window instead of treating it as 21 days", () => {
    const value = materialFixture();
    value.window.start = "2026-10-11T12:00:00.000Z";
    expect(
      materialChangesSchema(metricClient, "intelligence").safeParse(value)
        .success,
    ).toBe(false);
  });
});
describe("watch coverage receiving", () => {
  it.each(["core", "intelligence"] as const)(
    "preserves empty %s configuration as null, not zero percent",
    (backend) => {
      expect(
        watchCoverageSchema(metricClient, backend).parse(
          coverageFixture(backend),
        ).overall.percentage,
      ).toBeNull();
    },
  );
  it("preserves Core's configured but unsupported model", () => {
    const value = coverageFixture("core");
    Object.assign(value.configuration, {
      configured: true,
      complete: false,
      tagCount: 2,
      reason: "CORE_WATCHLIST_MODEL_UNSUPPORTED",
    });
    value.overall.status = "UNSUPPORTED";
    expect(
      watchCoverageSchema(metricClient, "core").parse(value).overall.percentage,
    ).toBeNull();
    value.overall.percentage = 100;
    expect(
      watchCoverageSchema(metricClient, "core").safeParse(value).success,
    ).toBe(false);
  });
  it("accepts measured mixed federal/state topics without borrowing another backend", () => {
    expect(
      watchCoverageSchema(metricClient, "intelligence").parse(coveredFixture())
        .overall.percentage,
    ).toBe(100);
    expect(
      watchCoverageSchema(metricClient, "core").safeParse(coveredFixture())
        .success,
    ).toBe(false);
  });
  it("keeps unmapped flat criteria outside the denominator and complete percentage", () => {
    const value = coveredFixture();
    Object.assign(value.configuration, {
      flatTermCount: 3,
      complete: false,
      reason: "UNMAPPED_WATCHLIST_CONFIGURATION",
    });
    value.overall.status = "PARTIAL";
    value.overall.percentage = null;
    expect(
      watchCoverageSchema(metricClient, "intelligence").parse(value).overall
        .coveredConcepts,
    ).toBe(1);
    value.overall.percentage = 100;
    expect(
      watchCoverageSchema(metricClient, "intelligence").safeParse(value)
        .success,
    ).toBe(false);
  });
  it.each(["UNSUPPORTED", "STALE", "UNAVAILABLE", "PARTIAL"] as const)(
    "retains topic status %s with measured zero",
    (status) => {
      const value = coveredFixture();
      value.concepts[0]!.status = status;
      value.overall = {
        coveredConcepts: 0,
        totalConcepts: 1,
        percentage: 0,
        status,
      };
      expect(
        watchCoverageSchema(metricClient, "intelligence").parse(value).overall
          .status,
      ).toBe(status);
    },
  );
  it("rejects legacy/foreign/inconsistent coverage instead of guessing", () => {
    const schema = watchCoverageSchema(metricClient, "intelligence");
    expect(
      schema.safeParse({ clientId: metricClient, overall: { percentage: 100 } })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...coveredFixture(), clientId: "foreign" }).success,
    ).toBe(false);
    const value = coveredFixture();
    value.overall.totalConcepts = 2;
    expect(schema.safeParse(value).success).toBe(false);
  });
});
