import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  calendarDate,
  event,
  identity,
  plannerId,
  read,
  recordParams,
} from "./planner-schemas";
import { timeOptions } from "./planner-time-options";
const source =
  "capirov2@4be13b0 planner.controller.ts + planner.service.ts:3682-4410 + strategy-verifier/planner-timesheets.ts";
const day = z.object({
  date: calendarDate,
  totalMinutes: z.number(),
  billableMinutes: z.number(),
});
const time = z
  .object({
    workedOn: calendarDate,
    timeZone: z.string().min(1).max(100),
    billable: z.boolean(),
    projectId: plannerId.nullable(),
    category: z.string().max(200),
  })
  .strict();
const entry = event
  .extend({
    time,
    taskName: z.string().nullable(),
    projectName: z.string().nullable(),
    canEdit: z.boolean(),
  })
  .strip();
export const timesheet = z
  .object({
    id: plannerId.nullable(),
    userId: identity,
    weekOn: calendarDate,
    throughOn: calendarDate,
    reviewerId: identity.nullable(),
    status: z.enum(["draft", "submitted", "approved", "rejected"]),
    version: z.number().int().nonnegative(),
    revision: z.string().regex(/^[a-f0-9]{64}$/),
    notes: z.string(),
    totalMinutes: z.number(),
    billableMinutes: z.number(),
    days: z.array(day),
    items: z.array(entry),
    nextCursor: plannerId.nullable(),
    matched: z.number(),
    actions: z.array(
      z.enum([
        "submit",
        "recall_submission",
        "approve",
        "reject",
        "recall_approval",
      ]),
    ),
    history: z.array(event),
    canLogTime: z.boolean().optional(),
    nextWorkCursor: z.string().nullable().optional(),
    matchedWork: z.number().int().nonnegative().optional(),
    timeNotice: z.string().nullable().optional(),
    approvalProcess: z.enum(["simple", "full"]).optional(),
    workRows: z
      .array(
        z
          .object({
            key: z.string(),
            taskId: plannerId.nullable(),
            projectId: plannerId.nullable(),
            taskName: z.string().nullable(),
            projectName: z.string().nullable(),
            days: z.array(day),
            totalMinutes: z.number(),
            billableMinutes: z.number(),
            canLogTime: z.boolean(),
            canRemove: z.boolean(),
          })
          .strip(),
      )
      .optional(),
  })
  .strip();
const timesheetQuery = z
  .object({
    week: calendarDate.optional(),
    userId: identity.optional(),
    cursor: plannerId.optional(),
    workCursor: z.string().max(80).optional(),
    historyCursor: plannerId.optional(),
    revision: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
const timeSettings = z.object({
  version: z.number().int().nonnegative(),
  canManage: z.boolean(),
  reviewers: z.record(z.string(), z.string()),
  options: timeOptions,
});
export const plannerTimeOperations = {
  "planner.timesheet.work": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/timesheets/work",
    request: z
      .object({
        body: z
          .object({
            week: calendarDate,
            userId: identity,
            version: z.number().int().nonnegative(),
            revision: z.string().regex(/^[a-f0-9]{64}$/),
            action: z.enum(["add", "remove"]),
            work: z
              .object({
                taskId: plannerId.nullable(),
                projectId: plannerId.nullable(),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    response: timesheet,
    source,
  }),

  "planner.time.export": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/time/entries",
    request: z
      .object({
        query: z
          .object({
            scope: z.enum(["personal", "review", "project", "organization"]),
            fromOn: calendarDate,
            throughOn: calendarDate,
            userId: identity.optional(),
            projectId: plannerId.optional(),
            cursor: plannerId.optional(),
            revision: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      fromOn: calendarDate,
      throughOn: calendarDate,
      revision: z.string(),
      matched: z.number(),
      totalMinutes: z.number(),
      billableMinutes: z.number(),
      unavailableEntries: z.boolean(),
      items: z.array(
        entry.extend({
          submitterName: z.string(),
          taskStatus: z.enum(["Open", "Completed"]).nullable(),
        }),
      ),
      nextCursor: plannerId.nullable(),
    }),
    source,
  }),
  "planner.timesheet": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/timesheets",
    request: z.object({ query: timesheetQuery.optional() }).strict(),
    response: timesheet,
    source,
  }),
  "planner.timesheet.status": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/timesheets/status",
    request: z
      .object({
        body: z
          .object({
            week: calendarDate,
            userId: identity,
            version: z.number().int().nonnegative(),
            revision: z.string().regex(/^[a-f0-9]{64}$/),
            action: z.enum([
              "submit",
              "recall_submission",
              "approve",
              "reject",
              "recall_approval",
            ]),
            notes: z.string().max(20000),
          })
          .strict(),
      })
      .strict(),
    response: timesheet,
    source,
  }),
  "planner.time.add": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/tasks/:id/events",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            kind: z.literal("time"),
            text: z.string().trim().min(1).max(20000),
            minutes: z.number().int().min(1).max(1440),
            time,
          })
          .strict(),
      })
      .strict(),
    response: event,
    source,
  }),
  "planner.time.project.add": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/projects/:id/events",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            kind: z.literal("time"),
            text: z.string().trim().min(1).max(20000),
            minutes: z.number().int().min(1).max(1440),
            time,
          })
          .strict(),
      })
      .strict(),
    response: event,
    source,
  }),
  "planner.time.settings": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/time/settings",
    request: read,
    response: timeSettings,
    source,
  }),
  "planner.time.settings.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/time/settings",
    request: z
      .object({
        body: z
          .object({
            version: z.number().int().nonnegative(),
            reviewers: z.record(z.string(), z.string()),
            options: timeOptions,
          })
          .strict(),
      })
      .strict(),
    response: timeSettings,
    source,
  }),
  "planner.timesheet.review": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/timesheets/review",
    request: z
      .object({
        query: z
          .object({
            week: calendarDate.optional(),
            cursor: identity.optional(),
            revision: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      weekOn: calendarDate,
      revision: z.string(),
      matched: z.number(),
      people: z.array(z.object({ id: identity, name: z.string() })),
      items: z.array(timesheet),
      nextCursor: z.string().nullable(),
      totalMinutes: z.number(),
      billableMinutes: z.number(),
    }),
    source,
  }),
};
