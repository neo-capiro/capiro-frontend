import type { PortfolioMetrics } from "../src/features/portfolio/index/metrics";
export const portfolioTenantId = "30000000-0000-4000-8000-000000000001";
export function portfolioMetricsFixture(now = Date.now()): PortfolioMetrics {
  return {
    definition: "portfolio-recorded-baseline-v1",
    tenantId: portfolioTenantId,
    observedAt: new Date(now).toISOString(),
    activityWindow: {
      start: new Date(now - 30 * 86400000).toISOString(),
      end: new Date(now).toISOString(),
      timezone: "UTC",
    },
    clients: {
      status: "available",
      coverage: "complete",
      counts: { activeClients: 60 },
    },
    objectives: {
      status: "available",
      coverage: "complete",
      counts: { objectives: 62, awaitingReview: 2, ready: 1 },
    },
    activity: {
      status: "available",
      coverage: "complete",
      counts: {
        recordedActivities: 612,
        overdueRequests: 3,
        overdueCommitments: 5,
      },
    },
    billWatch: {
      status: "available",
      coverage: "complete",
      counts: {
        activeClients: 60,
        clientsWithWatches: 30,
        clientBillWatches: 42,
        distinctBills: 12,
      },
    },
  };
}
