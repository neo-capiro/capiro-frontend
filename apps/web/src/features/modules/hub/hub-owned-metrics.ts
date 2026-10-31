import { aggregateClientId } from "../../../shared/capiro/operations/domain-aggregate-schemas";
import { plannerMetrics } from "../../../shared/capiro/operations/planner-metrics";
import { strategyMetrics } from "../../../shared/capiro/operations/strategy-metrics";
import { workspaceMetrics } from "../../../shared/capiro/operations/workspace-metrics";
import { WORKSPACE_METRIC_INCOMPLETE } from "../../../shared/capiro/workspace-metric-errors";
import type { HubMetricState } from "./hub-metrics";

export const ownedMetrics = {
  planner: {
    key: "planner.metrics.overdue",
    label: "Overdue unfinished tasks",
    schema: plannerMetrics,
    basis: "Timed and local-date deadlines",
  },
  strategies: {
    key: "strategies.metrics.active",
    label: "Active strategies",
    schema: strategyMetrics,
    basis: "Unarchived strategies · All dates",
  },
  workspace: {
    key: "workspace.metrics.savedWork",
    label: "Saved work products",
    schema: workspaceMetrics,
    basis: "Draft and complete · One work product per packet · All dates",
  },
} as const;
export type OwnedMetricModule = keyof typeof ownedMetrics;

export function hubOwnedRequest(clientId: string) {
  if (clientId && !aggregateClientId.safeParse(clientId).success) return null;
  return { query: clientId ? { clientId: clientId.toLowerCase() } : {} };
}
type Observation = { state: HubMetricState; notice?: string };
export function ownedMetricObservation(
  module: OwnedMetricModule,
  query: { loading: boolean; error?: Error; data?: unknown },
  clientId: string,
  now: number,
): Observation {
  const request = hubOwnedRequest(clientId);
  const unavailable = (reason: string): Observation => ({
    state: { status: "unavailable", reason },
  });
  if (!request) return unavailable("Select a valid client scope.");
  if (query.error) {
    const status = "status" in query.error ? query.error.status : undefined;
    if (status === 401 || status === 403)
      return { state: { status: "denied" } };
    if (
      module === "workspace" &&
      status === 503 &&
      "upstreamCode" in query.error &&
      query.error.upstreamCode === WORKSPACE_METRIC_INCOMPLETE
    )
      return {
        state: {
          status: "partial",
          reason: "The saved work observation is incomplete; total withheld.",
        },
      };
    return unavailable("The metric could not be loaded.");
  }
  if (query.loading) return { state: { status: "loading" } };
  const parsed = ownedMetrics[module].schema.safeParse(query.data);
  if (!parsed.success) return unavailable("The total could not be verified.");
  const data = parsed.data;
  const matches = clientId
    ? data.scope.kind === "client" &&
      data.scope.clientId === request.query.clientId
    : data.scope.kind === "actor";
  if (!matches || !Number.isFinite(now))
    return unavailable("The observation does not match this scope.");
  if (!data.complete || data.count === null)
    return {
      state: {
        status: "partial",
        reason: "The source observation changed; total withheld.",
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
      "asOf" in data
        ? `As of ${data.asOf}`
        : `Observation started ${data.observationStartedAt}`,
  };
}
