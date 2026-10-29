import { expect, it } from "vitest";
import {
  activityMetricsFreshness,
  scopedActivityMetrics,
} from "../src/features/portfolio/client-profile/activity-metrics";
import {
  activityMetricsFixture,
  metricsClientId,
  metricsTenantId,
} from "./activity-metrics-fixture";
const schema = scopedActivityMetrics(metricsTenantId, metricsClientId);
it("accepts complete full counts and actual zeroes independently of any timeline page", () => {
  const fixture = activityMetricsFixture();
  expect(schema.parse(fixture).counts.recordedActivities).toBe(612);
  fixture.counts.recordedActivities = 0;
  expect(schema.parse(fixture).counts.recordedActivities).toBe(0);
});
it.each([
  { tenantId: "40000000-0000-4000-8000-000000000001" },
  { clientId: "40000000-0000-4000-8000-000000000001" },
  { coverage: "partial" },
  { definition: "guessed-health-score" },
  { observedAt: "2026-01-01" },
])("refuses unsupported or foreign aggregates: %j", (change) => {
  expect(
    schema.safeParse({ ...activityMetricsFixture(), ...change }).success,
  ).toBe(false);
});
it("refuses impossible counts and changed window semantics", () => {
  const fixture = activityMetricsFixture();
  for (const count of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1])
    expect(
      schema.safeParse({
        ...fixture,
        counts: { ...fixture.counts, recordedActivities: count },
      }).success,
    ).toBe(false);
  expect(
    schema.safeParse({
      ...fixture,
      counts: { ...fixture.counts, overdueRequests: 9 },
    }).success,
  ).toBe(false);
  expect(
    schema.safeParse({
      ...fixture,
      window: { ...fixture.window, start: fixture.observedAt },
    }).success,
  ).toBe(false);
});
it("makes stale observations and clock skew explicit at the two-minute boundary", () => {
  const now = Date.now();
  expect(
    activityMetricsFreshness(activityMetricsFixture(now - 120000), now),
  ).toBe("current");
  expect(
    activityMetricsFreshness(activityMetricsFixture(now - 120001), now),
  ).toBe("stale");
  expect(
    activityMetricsFreshness(activityMetricsFixture(now + 120001), now),
  ).toBe("stale");
});
