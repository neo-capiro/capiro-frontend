import { z } from "zod";
import { defineOperation } from "../../contracts";
import {
  broadcastDetailSchema,
  broadcastMemberSchema,
  broadcastSchema,
  recordParams,
} from "./schemas";

const source =
  "apps/api/src/admin-broadcasts/admin-broadcasts.controller.ts + admin-broadcasts.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const tenantQuery = z
  .object({ query: z.object({ tenantId: z.uuid() }).strict() })
  .strict();
export const broadcastOperations = {
  "me.broadcasts.pending": defineOperation({
    service: "core",
    method: "GET",
    path: "/me/broadcasts/pending",
    request: z.object({}).strict(),
    response: z
      .array(
        z.object({
          id: z.uuid(),
          title: z.string().max(200),
          body: z.string().max(5000),
          createdAt: z.iso.datetime({ offset: true }),
        }),
      )
      .max(100),
    source:
      "apps/api/src/admin-broadcasts/me-broadcasts.controller.ts + admin-broadcasts.service.ts@2262b5c2282e04dfd1a9bb7f54675769f45af71c",
  }),
  "me.broadcasts.acknowledge": defineOperation({
    service: "core",
    method: "POST",
    path: "/me/broadcasts/:id/acknowledge",
    request: z.object({ params: z.object({ id: z.uuid() }).strict() }).strict(),
    response: z.object({
      ok: z.literal(true),
      broadcastId: z.uuid(),
      acknowledgedAt: z.iso.datetime({ offset: true }),
    }),
    source:
      "apps/api/src/admin-broadcasts/me-broadcasts.controller.ts + admin-broadcasts.service.ts@2262b5c2282e04dfd1a9bb7f54675769f45af71c",
  }),
  "settings.hq.broadcasts.members": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/broadcasts/tenant-members",
    request: tenantQuery,
    response: z.array(broadcastMemberSchema),
    source,
  }),
  "settings.hq.broadcasts.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/broadcasts",
    request: tenantQuery,
    response: z.array(broadcastSchema),
    source,
  }),
  "settings.hq.broadcasts.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/broadcasts/:id",
    request: z.object({ params: recordParams }).strict(),
    response: broadcastDetailSchema,
    source,
  }),
  "settings.hq.broadcasts.send": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/broadcasts",
    request: z
      .object({
        body: z
          .object({
            tenantId: z.uuid(),
            title: z.string().min(1).max(200),
            body: z.string().min(1).max(5000),
            audience: z.enum(["all_users", "selected_users"]),
            userIds: z
              .array(z.uuid())
              .max(500)
              .refine((ids) => new Set(ids).size === ids.length)
              .optional(),
          })
          .strict(),
      })
      .strict(),
    response: broadcastDetailSchema,
    source,
  }),
  "settings.hq.broadcasts.archive": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/broadcasts/:id/archive",
    request: z.object({ params: recordParams }).strict(),
    response: broadcastDetailSchema,
    source,
  }),
} as const;
