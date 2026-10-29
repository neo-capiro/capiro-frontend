import type { ActivityMetrics } from "../src/features/portfolio/client-profile/activity-metrics";
export const metricsTenantId = "30000000-0000-4000-8000-000000000001";
export const metricsClientId = "10000000-0000-4000-8000-000000000001";
export function activityMetricsFixture(now = Date.now()): ActivityMetrics {
  return {
    definition: "client-recorded-activity-v1",
    tenantId: metricsTenantId,
    clientId: metricsClientId,
    observedAt: new Date(now).toISOString(),
    coverage: "complete",
    window: {
      start: new Date(now - 30 * 86400000).toISOString(),
      end: new Date(now).toISOString(),
      timezone: "UTC",
    },
    counts: {
      recordedActivities: 612,
      openRequests: 8,
      overdueRequests: 3,
      openCommitments: 5,
      overdueCommitments: 2,
    },
  };
}
