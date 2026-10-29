import { expect, it } from "vitest";
import {
  portfolioMetricFreshness,
  portfolioMetricsFor,
} from "../src/features/portfolio/index/metrics";
import {
  portfolioMetricsFixture,
  portfolioTenantId,
} from "./portfolio-metrics-fixture";
const schema = portfolioMetricsFor(portfolioTenantId);
it("accepts complete populations, unavailable individual sources and real zeros", () => {
  const fixture = portfolioMetricsFixture();
  expect(schema.parse(fixture).clients).toMatchObject({
    counts: { activeClients: 60 },
  });
  fixture.clients = { status: "unavailable" };
  fixture.objectives = {
    status: "available",
    coverage: "complete",
    counts: { objectives: 0, awaitingReview: 0, ready: 0 },
  };
  expect(schema.parse(fixture)).toMatchObject({
    clients: { status: "unavailable" },
    objectives: { counts: { objectives: 0 } },
  });
});
it.each([
  { tenantId: "40000000-0000-4000-8000-000000000001" },
  { definition: "guessed-health-score" },
  {
    clients: {
      status: "available",
      coverage: "partial",
      counts: { activeClients: 3 },
    },
  },
  {
    clients: {
      status: "available",
      coverage: "complete",
      counts: { activeClients: -1 },
    },
  },
  {
    objectives: {
      status: "available",
      coverage: "complete",
      counts: { objectives: 1, awaitingReview: 2, ready: 0 },
    },
  },
  {
    billWatch: {
      status: "available",
      coverage: "complete",
      counts: {
        activeClients: 0,
        clientsWithWatches: 1,
        clientBillWatches: 1,
        distinctBills: 1,
      },
    },
  },
])("refuses foreign, incomplete or impossible aggregates: %j", (change) => {
  expect(
    schema.safeParse({ ...portfolioMetricsFixture(), ...change }).success,
  ).toBe(false);
});
it("requires the approved 30-day UTC window and exposes staleness and clock skew", () => {
  const fixture = portfolioMetricsFixture(),
    now = Date.now();
  expect(
    schema.safeParse({
      ...fixture,
      activityWindow: { ...fixture.activityWindow, start: fixture.observedAt },
    }).success,
  ).toBe(false);
  expect(
    portfolioMetricFreshness(portfolioMetricsFixture(now - 120000), now),
  ).toBe("current");
  expect(
    portfolioMetricFreshness(portfolioMetricsFixture(now - 120001), now),
  ).toBe("stale");
  expect(
    portfolioMetricFreshness(portfolioMetricsFixture(now + 120001), now),
  ).toBe("stale");
});
