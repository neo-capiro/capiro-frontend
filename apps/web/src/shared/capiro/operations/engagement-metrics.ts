import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  aggregateRequest,
  domainAggregateStatus,
  statusAggregateFields,
} from "./domain-aggregate-schemas";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Receiving contract for the proposed Engagement aggregate. The producer is not
 * merged or sealed yet, so only the ratified observation envelope is enforced:
 * the fixed 30 x 24-hour UTC [start,end) window, the created-or-sent basis and
 * one counted record per canonical saved outreach ID. The count formula,
 * authority and candidate bound stay with the producer.
 */
export const engagementMetrics = z
  .intersection(
    z.object({
      ...statusAggregateFields,
      metric: z.literal("personal_classic_outreach_30d"),
      window: z
        .object({
          start: z.iso.datetime(),
          end: z.iso.datetime(),
          bounds: z.literal("[start,end)"),
          basis: z.literal("created_or_sent"),
        })
        .strict(),
    }),
    domainAggregateStatus,
  )
  .refine(
    (data) =>
      Date.parse(data.window.end) - Date.parse(data.window.start) ===
      THIRTY_DAYS_MS,
  );

export const engagementMetricOperations = {
  "engagement.metrics.personalClassicOutreach30d": defineOperation({
    service: "engagement",
    method: "GET",
    path: "/engagement/outreach-metrics",
    request: aggregateRequest,
    response: engagementMetrics,
    source:
      "B9-REMAINING-AGGREGATE-CONTRACTS-20261031 proposal - producer unsealed",
  }),
} as const;
