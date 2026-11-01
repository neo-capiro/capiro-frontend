import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  aggregateRequest,
  domainAggregateStatus,
  statusAggregateFields,
} from "./domain-aggregate-schemas";

/**
 * Receiving contract for the proposed Research Portfolio aggregate: distinct
 * active portfolios under a current same-tenant viewer/editor/owner grant.
 * Grant and client-link multiplicity never multiply the count, and the
 * producer's 4096-row authority bound surfaces as a capped incomplete
 * observation rather than a partial count. No window field.
 */
export const researchPortfolioMetrics = z.intersection(
  z.object({
    ...statusAggregateFields,
    metric: z.literal("active_research_portfolios"),
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
      "B9-REMAINING-AGGREGATE-CONTRACTS-20261031 proposal - producer unsealed",
  }),
} as const;
