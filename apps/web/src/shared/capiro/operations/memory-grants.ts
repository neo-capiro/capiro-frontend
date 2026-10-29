import { z } from "zod";
import { defineOperation } from "../contracts";
const source = "Core memory.controller.ts and memory-access-grant.service.ts";
const id = z.string().uuid();
const permission = z.enum([
  "propose",
  "review",
  "approve",
  "edit",
  "confirm",
  "mark_stale",
  "revoke",
  "resolve_conflict",
]);
const date = z.string().datetime({ offset: true });
const params = z.object({ clientId: id }).strict();
export const memoryGrantSchema = z
  .object({
    id,
    clientId: id.nullable(),
    userId: id,
    permissions: z.array(permission),
    status: z.string(),
    grantedByUserId: id.nullable(),
    reason: z.string().nullable(),
    expiresAt: date.nullable(),
    revokedAt: date.nullable(),
    revokedByUserId: id.nullable(),
    createdAt: date,
    updatedAt: date,
  })
  .strict();
export type MemoryGrant = z.infer<typeof memoryGrantSchema>;
export const memoryGrantOperations = {
  "settings.memory.grants.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/clients/:clientId/grants",
    source,
    request: z.object({ params }).strict(),
    response: z.object({ grants: z.array(memoryGrantSchema) }).strict(),
  }),
  "settings.memory.grants.permissions": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/grants/permissions",
    source,
    request: z.object({}).strict(),
    response: z.object({ permissions: z.array(permission) }).strict(),
  }),
  "settings.memory.grants.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/memory/clients/:clientId/grants",
    source,
    request: z
      .object({
        params,
        body: z
          .object({
            id,
            userId: id,
            permissions: z.array(permission).min(1),
            reason: z.string().min(1).max(500),
            expiresAt: date,
          })
          .strict(),
      })
      .strict(),
    response: z
      .object({
        ok: z.literal(true),
        id,
        permissions: z.array(permission).min(1),
        expiresAt: date,
      })
      .strict(),
  }),
  "settings.memory.grants.revoke": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/memory/clients/:clientId/grants/:userId",
    source,
    request: z.object({ params: params.extend({ userId: id }) }).strict(),
    response: z.object({ ok: z.literal(true), revoked: z.boolean() }).strict(),
  }),
} as const;
