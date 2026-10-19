import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  hearingIdParams,
  officialDateSchema,
} from "./legiwatch-calendar-schemas";
import {
  compositionBodySchema,
  contactBodySchema,
  contactSchema,
  folderBillSchema,
  folderSchema,
  frozenReportRunSchema,
  listBodySchema,
  listSchema,
  recipientSchema,
  reportBodySchema,
  reportCompositionSchema,
  reportRunSchema,
  reportSchema,
} from "./legiwatch-report-schemas";

const source =
  "apps/intel-api/src/tracker/reports/report.controller.ts; report.service.ts; recipients.service.ts; report-delivery.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const folders =
  "apps/intel-api/src/tracker/folders/folder-tracker.controller.ts; folder-tracker.service.ts; sourcedata/folder-source-data.repository.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const base = "/legiwatch/reports",
  empty = z.object({}).strict(),
  params = z.object({ params: hearingIdParams }).strict();
export const legiwatchReportOperations = {
  "legiwatch.folders": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/folders",
    request: empty,
    response: z.array(folderSchema),
    source: folders,
  }),
  "legiwatch.folder.sessions": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/folders/sessions/:jurisdiction",
    request: z
      .object({
        params: z
          .object({ jurisdiction: z.string().regex(/^[A-Z]{2}$/) })
          .strict(),
      })
      .strict(),
    response: z.array(z.object({ key: z.string(), label: z.string() })),
    source: folders,
  }),
  "legiwatch.folder.resolve": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folders/resolve",
    request: z
      .object({
        body: z
          .object({
            folderIds: z.array(z.uuid()).max(20).optional(),
            jurisdiction: z.string().regex(/^[A-Z]{2}$/),
            sessionKey: z.string().regex(/^\d{3,4}(x\d+)?$/),
            billNumbers: z.string().min(1).max(4000),
          })
          .strict(),
      })
      .strict(),
    response: z.array(
      z.object({
        token: z.string(),
        status: z.enum(["resolved", "duplicate", "ambiguous", "unresolved"]),
        bill: folderBillSchema.nullable(),
        reason: z.string().nullable(),
        alreadyIn: z.array(z.string()).optional(),
      }),
    ),
    source: folders,
  }),
  "legiwatch.folder.bulk": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folders/:id/bills",
    request: z
      .object({
        params: hearingIdParams,
        body: z
          .object({
            billIds: z.array(z.string().min(1).max(100)).min(1).max(200),
            action: z.enum(["add", "remove"]),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      results: z.array(z.object({ billId: z.string(), status: z.string() })),
      alertsActivated: z.literal(false),
    }),
    source: folders,
  }),
  "legiwatch.reports": defineOperation({
    service: "intelligence",
    method: "GET",
    path: base,
    request: empty,
    response: z.array(reportSchema),
    source,
  }),
  "legiwatch.report.create": defineOperation({
    service: "intelligence",
    method: "POST",
    path: base,
    request: z.object({ body: reportBodySchema }).strict(),
    response: reportSchema,
    source,
  }),
  "legiwatch.report.update": defineOperation({
    service: "intelligence",
    method: "PUT",
    path: `${base}/:id`,
    request: z
      .object({
        params: hearingIdParams,
        body: reportBodySchema
          .extend({ expectedVersion: z.number().int().min(0) })
          .strict(),
      })
      .strict(),
    response: reportSchema,
    source,
  }),
  "legiwatch.report.duplicate": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/duplicate`,
    request: params,
    response: reportSchema,
    source,
  }),
  "legiwatch.report.generate": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/generate`,
    request: z
      .object({
        params: hearingIdParams,
        body: z
          .object({
            cutoff: officialDateSchema,
            audience: z.enum(["internal", "external"]),
            expectedVersion: z.number().int().min(0).optional(),
          })
          .strict(),
      })
      .strict(),
    response: frozenReportRunSchema,
    timeoutMs: 180000,
    source,
  }),
  "legiwatch.report.history": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/history`,
    request: z
      .object({
        query: z
          .object({
            reportId: z.string().optional(),
            before: z.iso.datetime().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(reportRunSchema),
    source,
  }),
  "legiwatch.report.run": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/runs/:id`,
    request: params,
    response: frozenReportRunSchema,
    source,
  }),
  "legiwatch.report.recipients": defineOperation({
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
  "legiwatch.report.contact.create": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/contacts`,
    request: z.object({ body: contactBodySchema }).strict(),
    response: contactSchema,
    source,
  }),
  "legiwatch.report.contact.update": defineOperation({
    service: "intelligence",
    method: "PUT",
    path: `${base}/contacts/:id`,
    request: z
      .object({
        params: hearingIdParams,
        body: contactBodySchema
          .extend({ expectedVersion: z.number().int().min(0) })
          .strict(),
      })
      .strict(),
    response: contactSchema,
    source,
  }),
  "legiwatch.report.list.create": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/lists`,
    request: z.object({ body: listBodySchema }).strict(),
    response: listSchema,
    source,
  }),
  "legiwatch.report.list.update": defineOperation({
    service: "intelligence",
    method: "PUT",
    path: `${base}/lists/:id`,
    request: z
      .object({
        params: hearingIdParams,
        body: listBodySchema
          .extend({ expectedVersion: z.number().int().min(0) })
          .strict(),
      })
      .strict(),
    response: listSchema,
    source,
  }),
  "legiwatch.report.compose": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/runs/:id/compose`,
    request: z
      .object({ params: hearingIdParams, body: compositionBodySchema })
      .strict(),
    response: reportCompositionSchema,
    source,
  }),
  "legiwatch.report.send": defineOperation({
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
  "legiwatch.report.deliveries": defineOperation({
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
