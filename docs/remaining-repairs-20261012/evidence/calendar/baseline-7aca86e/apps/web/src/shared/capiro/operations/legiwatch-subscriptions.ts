import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  monitorId,
  monitorParams,
  monitorVersion,
  scheduleTime,
} from "./legiwatch-monitor-schemas";
import {
  recipientSchema,
  recipientSelectionSchema,
} from "./legiwatch-report-schemas";
const source =
  "apps/intel-api/src/tracker/reports/report.controller.ts; report-subscription.service.ts; reports/report-schedule.ts; prisma/schema.prisma @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const subscription = z.object({
  id: z.string(),
  reportId: z.string(),
  reportVersion: z.number(),
  timezone: z.string(),
  localMinutes: z.number(),
  mode: z.enum(["draft", "send"]),
  enabled: z.boolean(),
  sendNoChange: z.boolean(),
  catchUp: z.enum(["draft", "send"]),
  recipients: z.array(recipientSchema),
  subject: z.string(),
  introduction: z.string(),
  version: monitorVersion,
  baselineAt: z.string().nullable(),
  nextDueAt: z.string().nullable(),
});
export const subscriptionBody = z
  .object({
    reportId: monitorId,
    ...scheduleTime,
    mode: z.enum(["draft", "send"]),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine((value) => !/[\r\n]/.test(value)),
    introduction: z.string().max(20000),
    selection: z.array(recipientSelectionSchema).max(500),
    sendNoChange: z.boolean(),
    catchUp: z.enum(["draft", "send"]),
  })
  .strict();
const occurrence = z.object({
  id: z.string(),
  state: z.string(),
  intendedAt: z.string(),
  windowStart: z.string(),
  windowEnd: z.string(),
  runId: z.string().nullable(),
  attempts: z.number(),
  error: z.string().nullable(),
});
const params = z.object({ params: monitorParams }).strict();
export const legiwatchSubscriptionOperations = {
  "legiwatch.subscriptions": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/reports/subscriptions",
    request: z.object({}).strict(),
    response: z.array(subscription),
    source,
  }),
  "legiwatch.subscription.create": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/reports/subscriptions",
    request: z.object({ body: subscriptionBody }).strict(),
    response: subscription,
    source,
  }),
  "legiwatch.subscription.save": defineOperation({
    service: "intelligence",
    method: "PUT",
    path: "/legiwatch/reports/subscriptions/:id",
    request: z
      .object({
        params: monitorParams,
        body: subscriptionBody
          .extend({ expectedVersion: monitorVersion })
          .strict(),
      })
      .strict(),
    response: subscription,
    source,
  }),
  "legiwatch.subscription.activation": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/reports/subscriptions/:id/activation",
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            enabled: z.boolean(),
            confirmSend: z.boolean(),
            resumePolicy: z.enum(["from_now", "catch_up_draft"]),
          })
          .strict(),
      })
      .strict(),
    response: subscription,
    timeoutMs: 180000,
    source,
  }),
  "legiwatch.subscription.run": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/reports/subscriptions/:id/run-now",
    request: z
      .object({
        params: monitorParams,
        body: z.object({ requestKey: z.string().min(8).max(100) }).strict(),
      })
      .strict(),
    response: z.object({ id: z.string(), mode: z.literal("draft") }),
    timeoutMs: 180000,
    source,
  }),
  "legiwatch.subscription.history": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/reports/subscriptions/:id/history",
    request: params,
    response: z.array(occurrence),
    source,
  }),
  "legiwatch.subscription.retry": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/reports/occurrences/:id/retry",
    request: params,
    response: occurrence,
    source,
  }),
} as const;
