import { z } from "zod";
import { defineOperation } from "../contracts";
import { resourcePatchSchema } from "./planner-resource-data";
import {
  event,
  plannerId,
  read,
  recordParams,
  resource,
  resourceKinds,
  version,
} from "./planner-schemas";
const source =
  "capirov2@4be13b0 planner.controller.ts + planner.service.ts:4645 + planner-resources.ts";
export const resourceMutation = z
  .object({
    kind: z.enum(resourceKinds).optional(),
    projectId: plannerId.nullable().optional(),
    name: z.string().trim().min(1).max(500).optional(),
    data: resourcePatchSchema.optional(),
    version: version.optional(),
    archived: z.boolean().optional(),
  })
  .strict();
export const plannerResourceOperations = {
  "planner.resources": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/resources",
    request: read,
    response: z.array(resource),
    source,
  }),
  "planner.resource.create": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/resources",
    request: z
      .object({
        body: resourceMutation.required({ kind: true, name: true, data: true }),
      })
      .strict(),
    response: resource,
    source,
  }),
  "planner.resource.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/resources/:id",
    request: z
      .object({ params: recordParams, body: resourceMutation })
      .strict(),
    response: resource,
    source,
  }),
  "planner.inbox": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/inbox",
    request: z
      .object({
        query: z
          .object({
            paged: z.enum(["true", "false"]).optional(),
            cursor: plannerId.optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.union([
      z.array(
        z.object({
          id: plannerId,
          event,
          read: z.boolean(),
          archived: z.boolean(),
        }),
      ),
      z.object({
        items: z.array(
          z.object({
            id: plannerId,
            event,
            read: z.boolean(),
            archived: z.boolean(),
          }),
        ),
        nextCursor: plannerId.nullable(),
      }),
    ]),
    source,
  }),
  "planner.inbox.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/inbox/:id",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            read: z.boolean().optional(),
            archived: z.boolean().optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ ok: z.boolean() }),
    source,
  }),
  "planner.notifications.read": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/notifications/read-all",
    request: read,
    response: z.object({ read: z.number().int().nonnegative() }),
    source,
  }),
  "planner.goal.follow": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/goals/:id/follow",
    request: z
      .object({
        params: recordParams,
        body: z.object({ following: z.boolean(), version }).strict(),
      })
      .strict(),
    response: z.object({ following: z.boolean() }).strip(),
    source,
  }),
};
