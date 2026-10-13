import { z } from "zod";
import { defineOperation } from "../contracts";
import { publicFormToken } from "./planner-public-forms";
import {
  calendarDate,
  plannerId,
  plannerTask,
  project,
  read,
  recordParams,
} from "./planner-schemas";
const source =
  "capirov2@4be13b0 planner.controller.ts + planner.service.ts:4415-5390";
const copyResponse = project;
const reportResponse = z.object({
  buckets: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.number(),
      count: z.number(),
    }),
  ),
  total: z.number().nullable(),
  matched: z.number().nullable(),
  unit: z.enum(["items", "minutes", "percent", "number"]),
  overlapping: z.boolean(),
  unavailableSources: z.boolean(),
  unavailableFields: z.boolean(),
  dashboardVersion: z.number(),
  revision: z.string(),
  items: z
    .array(
      z.object({
        id: plannerId,
        name: z.string(),
        entity: z.string(),
        status: z.string().nullable(),
        personName: z.string().nullable(),
        dueOn: calendarDate.nullable(),
        value: z.number(),
      }),
    )
    .optional(),
  nextCursor: plannerId.nullable().optional(),
});
export const plannerManagementOperations = {
  "planner.project.duplicate": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/projects/:id/duplicate",
    request: z
      .object({
        params: recordParams,
        body: z.object({ name: z.string().trim().min(1).max(500) }).strict(),
      })
      .strict(),
    response: copyResponse,
    source,
  }),
  "planner.template.instantiate": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/templates/:id/instantiate",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            name: z.string().trim().min(1).max(500),
            anchorOn: calendarDate.optional(),
          })
          .strict(),
      })
      .strict(),
    response: copyResponse,
    source,
  }),
  "planner.form.share": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/forms/:id/share",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            version: z.number().int().nonnegative(),
            enabled: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ token: publicFormToken.nullable() }),
    source,
  }),
  "planner.form.submit": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/forms/:id/submit",
    request: z
      .object({
        params: recordParams,
        body: z.record(
          plannerId,
          z.union([
            z.string().max(50000),
            z.number(),
            z.array(z.string()).max(100),
          ]),
        ),
      })
      .strict(),
    response: plannerTask,
    source,
  }),
  "planner.report.widget": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/reports/:id/widgets/:widgetId",
    request: z
      .object({
        params: z.object({ id: plannerId, widgetId: plannerId }).strict(),
        query: z
          .object({
            rows: z.enum(["true", "false"]).optional(),
            cursor: plannerId.optional(),
            bucket: z.string().max(1000).optional(),
            version: z.number().int().positive().optional(),
            revision: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: reportResponse,
    source,
  }),
  "planner.time.preferences": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/time/preferences",
    request: read,
    response: z
      .object({
        version: z.number().int().nonnegative(),
        autoAddDueTasks: z.boolean(),
      })
      .strip(),
    source,
  }),
  "planner.time.preferences.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/time/preferences",
    request: z
      .object({
        body: z
          .object({
            version: z.number().int().nonnegative(),
            autoAddDueTasks: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    response: z
      .object({
        version: z.number().int().nonnegative(),
        autoAddDueTasks: z.boolean(),
      })
      .strip(),
    source,
  }),
};
