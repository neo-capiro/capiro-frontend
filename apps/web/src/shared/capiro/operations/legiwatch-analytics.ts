import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "apps/api/src/live-hearings/legiwatch-wave3.controller.ts; legiwatch-analytics.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const scope = z.object({ clientId: z.uuid().optional() }).strict();
const range = scope
  .extend({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to);
const ranged = z.object({ query: range }).strict(),
  base = "/legiwatch/live-hearings";
const dates = { from: z.string(), to: z.string() };
export const legiwatchAnalyticsOperations = {
  "legiwatch.analytics.summary": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/analytics/summary`,
    request: ranged,
    response: z.object({
      ...dates,
      signalsTotal: z.number(),
      sourceFamiliesInvolved: z.number(),
      clientDecisions: z.number(),
      billsMoved: z.number(),
      billsTrackedTotal: z.number(),
      sourceCoveragePct: z.number().nullable(),
      sourceFamiliesCurrent: z.number(),
      sourceFamiliesTotal: z.number(),
      freshnessAt: z.string(),
    }),
    source,
  }),
  "legiwatch.analytics.volume": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/analytics/signal-volume`,
    request: ranged,
    response: z.object({
      ...dates,
      total: z.number(),
      days: z.array(z.object({ date: z.string(), count: z.number() })),
    }),
    source,
  }),
  "legiwatch.analytics.momentum": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/analytics/issue-momentum`,
    request: ranged,
    response: z.object({
      ...dates,
      topics: z.array(
        z.object({ topicId: z.string(), label: z.string(), index: z.number() }),
      ),
    }),
    source,
  }),
  "legiwatch.analytics.exposure": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/analytics/client-exposure`,
    request: z
      .object({
        query: z
          .object({
            from: z.iso.datetime().optional(),
            to: z.iso.datetime().optional(),
          })
          .strict()
          .refine(
            (value) => !value.from || !value.to || value.from <= value.to,
          ),
      })
      .strict(),
    response: z.object({
      ...dates,
      rows: z.array(
        z.object({
          clientId: z.string(),
          clientName: z.string(),
          monitored: z.boolean(),
          bySourceFamily: z.record(z.string(), z.number()).nullable(),
        }),
      ),
    }),
    source,
  }),
  "legiwatch.analytics.committees": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/analytics/committee-activity`,
    request: ranged,
    response: z.object({
      ...dates,
      total: z.number(),
      rows: z.array(
        z.object({
          systemCode: z.string(),
          committeeName: z.string(),
          count: z.number(),
        }),
      ),
    }),
    source,
  }),
  "legiwatch.analytics.coverage": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/analytics/source-coverage`,
    request: z.object({}).strict(),
    response: z.object({
      freshnessAt: z.string(),
      sources: z.array(
        z.object({
          family: z.string(),
          coveragePct: z.number().nullable(),
          total: z.number(),
          lastSyncedAt: z.string().nullable(),
        }),
      ),
    }),
    source,
  }),
} as const;
