import { z } from "zod";
import { defineOperation } from "../../contracts";

const source =
  "apps/api/src/help/support-requests/support-requests.controller.ts + support-requests.service.ts@d3c3c513ac940a363890deea6b25de694535f761";
const recordParams = z.object({ id: z.uuid() }).strict();
const summary = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  submittedByUserId: z.uuid(),
  summary: z.string().min(1).max(200),
  createdAt: z.iso.datetime({ offset: true }),
});
export const supportRequestBody = z
  .object({
    id: z.uuid(),
    summary: z.string().trim().min(1).max(200),
    detail: z.string().trim().min(1).max(5000),
    runReference: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();
export const supportRequestReceipt = summary.extend({
  detail: z.string().min(1).max(5000),
  runReference: z.string().min(1).max(200).nullable(),
});
export const supportRequestOperations = {
  "settings.support.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/me/support-requests",
    request: z.object({ body: supportRequestBody }).strict(),
    response: supportRequestReceipt,
    source,
  }),
  "settings.support.receipt": defineOperation({
    service: "core",
    method: "GET",
    path: "/me/support-requests/:id",
    request: z.object({ params: recordParams }).strict(),
    response: supportRequestReceipt,
    source,
  }),
  "settings.hq.support.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/support-requests",
    request: z
      .object({
        query: z
          .object({ tenantId: z.uuid(), cursor: z.uuid().optional() })
          .strict(),
      })
      .strict(),
    response: z.object({
      items: z.array(summary).max(50),
      nextCursor: z.uuid().nullable(),
    }),
    source,
  }),
  "settings.hq.support.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/support-requests/:id",
    request: z
      .object({
        params: recordParams,
        query: z.object({ tenantId: z.uuid() }).strict(),
      })
      .strict(),
    response: supportRequestReceipt,
    source,
  }),
} as const;
