import { z } from "zod";
import { defineOperation } from "../contracts";
import { hearingIdParams } from "./legiwatch-calendar-schemas";
import {
  compositionBodySchema,
  contactSchema,
  frozenDeliveryRunSchema,
  listSchema,
  recipientSchema,
  deliveryCompositionSchema,
} from "./legiwatch-delivery-schemas";
const source =
  "apps/intel-api/src/tracker/delivery/delivery.controller.ts; delivery.service.ts; draft-access.service.ts; recipients.service.ts (retained draft delivery)";
const base = "/legiwatch/deliveries",
  empty = z.object({}).strict(),
  params = z.object({ params: hearingIdParams }).strict();
export const legiwatchDeliveryOperations = {
  "legiwatch.delivery.run": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/runs/:id`,
    request: params,
    response: frozenDeliveryRunSchema,
    source,
  }),
  "legiwatch.delivery.recipients": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/recipients`,
    request: empty,
    response: z.object({
      senderEmail: z.string().nullable(),
      contacts: z.array(contactSchema),
      lists: z.array(listSchema),
    }),
    source,
  }),
  "legiwatch.delivery.compose": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/runs/:id/compose`,
    request: z
      .object({ params: hearingIdParams, body: compositionBodySchema })
      .strict(),
    response: deliveryCompositionSchema,
    source,
  }),
  "legiwatch.delivery.send": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/runs/:id/send`,
    request: z
      .object({
        params: hearingIdParams,
        body: compositionBodySchema
          .extend({ approvalHash: z.string().min(1) })
          .strict(),
      })
      .strict(),
    response: z.object({ id: z.string(), state: z.literal("queued") }),
    source,
  }),
  "legiwatch.delivery.history": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/runs/:id/deliveries`,
    request: params,
    response: z.array(
      z.object({
        id: z.string(),
        kind: z.string(),
        runId: z.string().nullable(),
        approvedAt: z.string(),
        recipients: z.array(
          z.object({
            id: z.string(),
            recipient: recipientSchema,
            channel: z.string(),
            state: z.string(),
            attempts: z.number(),
            nextAttemptAt: z.string(),
            providerId: z.string().nullable(),
            acceptedAt: z.string().nullable(),
            error: z.string().nullable(),
          }),
        ),
      }),
    ),
    source,
  }),
} as const;
