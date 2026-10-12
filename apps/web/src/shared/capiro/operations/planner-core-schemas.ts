import { z } from "zod";

export const plannerId = z.uuid();
export const identity = z.string().min(1).max(200);
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date.");
export const version = z.number().int().positive();
export const role = z.enum(["admin", "editor", "commenter", "viewer"]);
export const taskStatus = z.enum(["todo", "in_progress", "blocked", "done"]);
export const priority = z.enum(["none", "low", "medium", "high"]);
const membership = z
  .object({
    projectId: plannerId,
    sectionId: plannerId.nullable(),
    position: z.number().int().min(0),
  })
  .strict();
export const taskData = z
  .object({
    name: z.string().trim().min(1).max(500),
    description: z.string().max(50_000),
    status: taskStatus,
    priority,
    subtype: z.enum(["task", "milestone", "approval"]),
    approval: z.enum(["pending", "approved", "rejected", "changes_requested"]),
    startOn: calendarDate.nullable(),
    dueOn: calendarDate.nullable(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    dueTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable()
      .optional(),
    timeZone: z.string().max(100).nullable().optional(),
    assigneeId: identity.nullable(),
    parentId: plannerId.nullable(),
    dependencies: z.array(plannerId).max(100),
    collaborators: z.array(identity).max(100),
    tags: z.array(z.string().max(100)).max(100),
    memberships: z.array(membership).max(100),
    customValues: z.record(
      plannerId,
      z.union([z.string(), z.number(), z.array(z.string()), z.null()]),
    ),
    estimateMinutes: z.number().int().min(0).max(1_000_000),
    recurrence: z
      .object({
        frequency: z.enum([
          "daily",
          "weekly",
          "monthly",
          "yearly",
          "periodically",
        ]),
        interval: z.number().int().min(1).max(365),
        basedOn: z.enum(["due_date", "completion_date"]).optional(),
        weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
        endsOn: calendarDate.nullable().optional(),
        anchorOn: calendarDate.optional(),
      })
      .strict()
      .nullable(),
    clientId: plannerId.nullable(),
    meetingId: plannerId.nullable(),
  })
  .strict();
export const plannerTask = taskData
  .extend({
    id: plannerId,
    ownerId: identity,
    version,
    archived: z.boolean(),
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    access: role,
    actualMinutes: z.number().nonnegative(),
  })
  .strip();
export const person = z.object({ id: identity, name: z.string() });
export const projectData = z
  .object({
    name: z.string().trim().min(1).max(500),
    description: z.string().max(50_000),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    privacy: z.enum(["private", "team"]),
    allocationEditors: z.enum(["admins", "admins_and_editors"]).optional(),
    defaultView: z.enum(["list", "board", "calendar", "timeline", "gantt"]),
    sections: z
      .array(z.object({ id: plannerId, name: z.string().min(1).max(200) }))
      .max(100),
    fields: z
      .array(
        z.object({
          id: plannerId,
          name: z.string(),
          type: z.enum(["text", "number", "date", "select", "multi_select"]),
          options: z.array(z.string()),
        }),
      )
      .max(100),
    members: z.array(z.object({ userId: identity, role })).max(1000),
    startOn: calendarDate.nullable(),
    dueOn: calendarDate.nullable(),
    health: z.enum(["on_track", "at_risk", "off_track", "on_hold", "complete"]),
    clientId: plannerId.nullable(),
  })
  .strict();
export const project = projectData
  .extend({
    id: plannerId,
    ownerId: identity,
    version,
    archived: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    access: role,
  })
  .strip();
export const event = z
  .object({
    id: plannerId,
    kind: z.string(),
    text: z.string(),
    createdAt: z.string(),
    minutes: z.number().nullable(),
    actorId: identity,
  })
  .strip();
export const taskPage = z.object({
  items: z.array(plannerTask),
  nextCursor: plannerId.nullable(),
});
export const read = z.object({}).strict();
export const recordParams = z.object({ id: plannerId }).strict();
export type PlannerTask = z.infer<typeof plannerTask>;
export type PlannerProject = z.infer<typeof project>;
export type PlannerPerson = z.infer<typeof person>;
