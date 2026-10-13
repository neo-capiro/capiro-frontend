import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  event,
  person,
  plannerId,
  plannerTask,
  project,
  projectData,
  read,
  recordParams,
  taskData,
  taskPage,
  version,
} from "./planner-schemas";
import { timeOptions } from "./planner-time-options";
const source =
  "capirov2@4be13b0 apps/api-strategy/src/planner/planner.controller.ts + planner.validation.ts + strategy-verifier/planner.ts";
const mutation = z
  .object({
    data: taskData.partial(),
    version: version.optional(),
    archived: z.boolean().optional(),
  })
  .strict();
const projectMutation = z
  .object({
    data: projectData.partial(),
    version: version.optional(),
    archived: z.boolean().optional(),
  })
  .strict();
export const plannerTaskOperations = {
  "planner.bootstrap": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/bootstrap",
    request: read,
    response: z.object({
      me: person,
      people: z.array(person),
      projects: z.array(project),
      timeAdmin: z.boolean().optional(),
      timeOptions: timeOptions.optional(),
    }),
    source,
  }),
  "planner.tasks": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/tasks",
    request: z
      .object({
        query: z
          .object({
            projectId: plannerId.optional(),
            mine: z.enum(["true", "false"]).optional(),
            search: z.string().max(200).optional(),
            cursor: plannerId.optional(),
            archived: z.enum(["true", "false"]).optional(),
            parentId: plannerId.optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: taskPage,
    source,
  }),
  "planner.task": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/tasks/:id",
    request: z.object({ params: recordParams }).strict(),
    response: plannerTask,
    source,
  }),
  "planner.task.create": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/tasks",
    request: z.object({ body: mutation }).strict(),
    response: plannerTask,
    source,
  }),
  "planner.task.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/tasks/:id",
    request: z.object({ params: recordParams, body: mutation }).strict(),
    response: plannerTask,
    source,
  }),
  "planner.task.import": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/tasks/import",
    request: z
      .object({
        body: z
          .object({
            importKey: plannerId,
            data: taskData.partial(),
            actualMinutes: z.number().int().min(0).max(1_000_000),
          })
          .strict(),
      })
      .strict(),
    response: plannerTask,
    source,
  }),
  "planner.project.create": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/projects",
    request: z.object({ body: projectMutation }).strict(),
    response: project,
    source,
  }),
  "planner.project.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/projects/:id",
    request: z.object({ params: recordParams, body: projectMutation }).strict(),
    response: project,
    source,
  }),
  "planner.task.events": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/tasks/:id/events",
    request: z.object({ params: recordParams }).strict(),
    response: z.array(event),
    source,
  }),
  "planner.task.comment": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/tasks/:id/events",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            kind: z.literal("comment"),
            text: z.string().trim().min(1).max(20_000),
          })
          .strict(),
      })
      .strict(),
    response: event,
    source,
  }),
};
