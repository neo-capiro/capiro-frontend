import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  aggregateClientId,
  aggregateRequest,
  domainAggregateStatus,
  statusAggregateFields,
} from "./domain-aggregate-schemas";

/**
 * Receiving contract from Core346 a4700d89 (awaiting independent review): distinct
 * active portfolios under a current same-tenant viewer/editor/owner grant.
 * Grant and client-link multiplicity never multiply the count, and the
 * producer's 4096-row authority bound surfaces as a capped incomplete
 * observation rather than a partial count. No window field.
 */
export const researchPortfolioMetrics = z.intersection(
  z.object({
    ...statusAggregateFields,
    metric: z.literal("active_research_portfolios"),
    scope: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("granted") }).strict(),
      z
        .object({ kind: z.literal("client"), clientId: aggregateClientId })
        .strict(),
    ]),
  }),
  domainAggregateStatus,
);

export const researchPortfolioMetricOperations = {
  "researchPortfolios.metrics.active": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/metrics",
    request: aggregateRequest,
    response: researchPortfolioMetrics,
    source:
      "Core346 a4700d89 research-portfolio-metrics.ts - producer review and rollout pending",
  }),
} as const;
