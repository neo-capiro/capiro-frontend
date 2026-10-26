import { z } from "zod";
import { defineOperation } from "../contracts";

export const engagementTaskId = z.uuid();
export const engagementTask = z
  .object({
    id: engagementTaskId,
    title: z.string(),
    status: z.enum(["todo", "in_progress", "blocked", "done", "canceled"]),
    dueDate: z.iso.datetime().nullable(),
    clientId: engagementTaskId.nullable(),
    client: z
      .object({ id: engagementTaskId, name: z.string() })
      .strict()
      .nullable(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (value) => value.clientId === (value.client?.id ?? null),
    "Task client does not match",
  );

export const engagementTaskOperations = {
  "engagement.task": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/tasks/:id",
    request: z
      .object({
        params: z.object({ id: engagementTaskId }).strict(),
        query: z
          .object({ clientId: engagementTaskId.optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: engagementTask,
    source:
      "Core EngagementController.task + EngagementService.readTask; exact EngagementTask current read",
  }),
} as const;
