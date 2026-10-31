import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  aggregateRequest,
  domainAggregateFields,
  domainAggregateState,
  orderedObservation,
} from "./domain-aggregate-schemas";

export const plannerMetrics = z
  .intersection(
    z.object({
      ...domainAggregateFields,
      metric: z.literal("planner.overdue_unfinished"),
      deadline: z.object({
        timed: z.literal("strictly_before_asOf"),
        dateOnly: z.literal("before_local_asOf_day"),
        defaultTimeZone: z.literal("UTC"),
      }),
    }),
    domainAggregateState,
  )
  .refine(orderedObservation);
export const plannerMetricOperations = {
  "planner.metrics.overdue": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/metrics/overdue",
    request: aggregateRequest,
    response: plannerMetrics,
    source:
      "Core343 ef2b93874113478706d5f1130a278fd6d8a481f5 / PlannerController.overdueAggregate",
  }),
} as const;
