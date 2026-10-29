import { z } from "zod";
import { defineOperation } from "../../contracts";

export const impersonationSessionSchema = z.object({
  sessionId: z.uuid(),
  tenantId: z.uuid(),
  tenantSlug: z.string().min(1),
  tenantName: z.string().min(1),
  reason: z.string().min(10).max(500),
  startedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  endedAt: z.iso.datetime().nullable(),
  endedReason: z.string().nullable(),
  status: z.enum(["active", "ended", "expired", "unavailable"]),
});
export type ImpersonationSession = z.infer<typeof impersonationSessionSchema>;
export const startImpersonationSchema = z
  .object({
    requestId: z.uuid(),
    tenantId: z.uuid(),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
const params = z.object({ sessionId: z.uuid() }).strict();
const source =
  "apps/api/src/capiro-admin/impersonation.controller.ts + impersonation.service.ts";
export const impersonationOperations = {
  "settings.hq.impersonation.active": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/impersonate",
    request: z.object({}).strict(),
    response: z.object({ session: impersonationSessionSchema.nullable() }),
    source,
  }),
  "settings.hq.impersonation.start": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/impersonate",
    request: z.object({ body: startImpersonationSchema }).strict(),
    response: impersonationSessionSchema.extend({ replayed: z.boolean() }),
    source,
  }),
  "settings.hq.impersonation.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/impersonate/:sessionId",
    request: z.object({ params }).strict(),
    response: impersonationSessionSchema,
    source,
  }),
  "settings.hq.impersonation.end": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/impersonate/end",
    request: z.object({ body: params }).strict(),
    response: impersonationSessionSchema.extend({ replayed: z.boolean() }),
    source,
  }),
  "settings.hq.impersonation.workspace": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/impersonate/:sessionId/workspace",
    request: z
      .object({
        params,
        query: z.object({ after: z.uuid().optional() }).strict().optional(),
      })
      .strict(),
    response: z.object({
      session: impersonationSessionSchema,
      readOnly: z.literal(true),
      clients: z
        .array(
          z.object({
            id: z.uuid(),
            name: z.string(),
            status: z.string(),
            website: z.string().nullable(),
            updatedAt: z.iso.datetime(),
          }),
        )
        .max(50),
      nextCursor: z.uuid().nullable(),
    }),
    source,
  }),
} as const;
