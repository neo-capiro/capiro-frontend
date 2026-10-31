import type { TrackerBackend } from "../src/shared/portfolio/config/config";
import type {
  MaterialChanges,
  WatchCoverage,
} from "../src/features/portfolio/bill-tracker/tracker-metrics-contracts";
export const metricClient = "00000000-0000-4000-8000-000000000001";
export function materialFixture(
  backend: TrackerBackend = "intelligence",
): MaterialChanges {
  return {
    metric: "tracker.material_changes",
    version: 1,
    backend,
    clientId: metricClient,
    window: {
      start: "2026-10-10T12:00:00.000Z",
      end: "2026-10-31T12:00:00.000Z",
      bounds: "[start,end)",
      days: 21,
    },
    asOf: "2026-10-31T12:00:00.000Z",
    observedAt: "2026-10-31T12:00:01.000Z",
    sourceObservedAt: null,
    count: 0,
    complete: true,
    capped: false,
  };
}
export function coverageFixture(
  backend: TrackerBackend = "intelligence",
): WatchCoverage {
  return {
    clientId: metricClient,
    backend,
    asOf: "2026-10-31T12:00:00.000Z",
    configuration: {
      model: backend === "core" ? "client_watchlist" : "intel_watchlist",
      configured: false,
      complete: true,
      topicCount: 0,
      tagCount: 0,
      flatTermCount: 0,
      issueAreaCount: 0,
      reason: null,
    },
    overall: {
      coveredConcepts: 0,
      totalConcepts: 0,
      percentage: null,
      status: "NOT_CONFIGURED",
    },
    concepts: [],
    signalFamilies: [],
    sourceHealth: {
      healthy: 0,
      degraded: 0,
      failing: 0,
      stale: 0,
      acceptedExceptions: 0,
    },
    recommendations: [],
  };
}
export function coveredFixture(): WatchCoverage {
  const value = coverageFixture();
  Object.assign(value.configuration, { configured: true, topicCount: 1 });
  value.overall = {
    coveredConcepts: 1,
    totalConcepts: 1,
    percentage: 100,
    status: "COVERED",
  };
  value.concepts = [
    {
      conceptId: "synthetic-topic",
      label: "Synthetic topic",
      signalFamilies: ["bill", "state_bill"],
      status: "COVERED",
      supportingSources: ["bill sync", "state_bill sync"],
      gaps: [],
      lastObservedAt: value.asOf,
    },
  ];
  value.signalFamilies = ["bill", "state_bill"].map((family) => ({
    family: family as "bill" | "state_bill",
    configuredConcepts: 1,
    coveredConcepts: 1,
    status: "COVERED",
  }));
  return value;
}
