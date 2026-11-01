import { engagementMetrics } from "../../../shared/capiro/operations/engagement-metrics";
import { researchPortfolioMetrics } from "../../../shared/capiro/operations/research-portfolio-metrics";
import type { HubMetricState } from "./hub-metrics";
import { hubOwnedRequest } from "./hub-owned-metrics";

/**
 * The two remaining Hub consumers. Both read an existing domain owner's
 * aggregate; this module never derives a count, scope or window itself.
 */
export const aggregateMetrics = {
  engagement: {
    key: "engagement.metrics.personalClassicOutreach30d",
    label: "Personal Classic outreach records · last 30 days",
    schema: engagementMetrics,
    basis:
      "Created or sent in the producer's fixed 30-day UTC window · One record counted once",
  },
  "research-portfolios": {
    key: "researchPortfolios.metrics.active",
    label: "Active research portfolios",
    schema: researchPortfolioMetrics,
    basis: "Granted active portfolios · All dates",
  },
} as const;
export type AggregateMetricModule = keyof typeof aggregateMetrics;
/** Same exact-client rule as the owned aggregates: invalid scope reads nothing. */
export const hubAggregateRequest = hubOwnedRequest;

type Observation = { state: HubMetricState; notice?: string };

export function aggregateMetricObservation(
  module: AggregateMetricModule,
  query: { loading: boolean; error?: Error; data?: unknown },
  clientId: string,
  now: number,
): Observation {
  const request = hubAggregateRequest(clientId);
  const unavailable = (reason: string): Observation => ({
    state: { status: "unavailable", reason },
  });
  if (!request) return unavailable("Select a valid client scope.");
  if (query.error) {
    const status = "status" in query.error ? query.error.status : undefined;
    if (status === 401 || status === 403)
      return { state: { status: "denied" } };
    return unavailable("The metric could not be loaded.");
  }
  if (query.loading) return { state: { status: "loading" } };
  const parsed = aggregateMetrics[module].schema.safeParse(query.data);
  if (!parsed.success) return unavailable("The total could not be verified.");
  const data = parsed.data;
  const matches = clientId
    ? data.scope.kind === "client" &&
      data.scope.clientId === request.query.clientId
    : data.scope.kind === "actor";
  if (!matches || !Number.isFinite(now))
    return unavailable("The observation does not match this scope.");
  if (data.status !== "complete" || data.count === null)
    return {
      state: {
        status: "partial",
        reason: "The source observation withheld the total.",
      },
    };
  return {
    state: {
      status: "available",
      value: data.count,
      observedAt: data.observedAt,
      stale: Math.abs(now - Date.parse(data.observedAt)) > 120_000,
    },
    notice:
      "window" in data
        ? `Window ${data.window.start} - ${data.window.end} · ${data.window.basis}`
        : `Observed ${data.observedAt}`,
  };
}
