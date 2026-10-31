import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  aggregateRequest,
  domainAggregateFields,
  domainAggregateState,
  orderedObservation,
} from "./domain-aggregate-schemas";

export const strategyMetrics = z
  .intersection(
    z.object({
      ...domainAggregateFields,
      metric: z.literal("strategy.active"),
    }),
    domainAggregateState,
  )
  .refine(orderedObservation);
export const strategyMetricOperations = {
  "strategies.metrics.active": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/strategies/metrics/active",
    request: aggregateRequest,
    response: strategyMetrics,
    source:
      "Core343 ef2b93874113478706d5f1130a278fd6d8a481f5 / StrategyController.activeAggregate",
  }),
} as const;
