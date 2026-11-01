import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  aggregateClientId,
  aggregateRequest,
  domainAggregateStatus,
  statusAggregateFields,
} from "./domain-aggregate-schemas";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Receiving contract from Core346 a4700d89 (awaiting independent review):
 * the fixed 30 x 24-hour UTC [start,end) window, the created-or-sent basis and
 * one counted record per canonical saved outreach ID. The count formula,
 * authority and candidate bound stay with the producer.
 */
export const engagementMetrics = z
  .intersection(
    z.object({
      ...statusAggregateFields,
      metric: z.literal("personal_classic_outreach_30d"),
      scope: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("personal_classic") }).strict(),
        z
          .object({ kind: z.literal("client"), clientId: aggregateClientId })
          .strict(),
      ]),
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
        THIRTY_DAYS_MS &&
      Date.parse(data.window.end) <= Date.parse(data.observedAt),
  );

export const engagementMetricOperations = {
  "engagement.metrics.personalClassicOutreach30d": defineOperation({
    service: "engagement",
    method: "GET",
    path: "/engagement/outreach-metrics",
    request: aggregateRequest,
    response: engagementMetrics,
    source:
      "Core346 a4700d89 classic-outreach-metrics.ts - producer review and rollout pending",
  }),
} as const;
