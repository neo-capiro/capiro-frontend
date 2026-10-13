import { z } from "zod";
import {
  calendarDate,
  identity,
  plannerId,
  priority,
  projectData,
  role,
  taskData,
  taskStatus,
} from "./planner-core-schemas";
const sharing = {
  description: z.string().max(50000),
  privacy: z.enum(["private", "team"]),
  members: z.array(z.object({ userId: identity, role }).strict()).max(1000),
};
const ids = z.array(plannerId).max(100);
const portfolio = z.object({ ...sharing, projectIds: ids }).strict();
const goal = portfolio
  .extend({
    ownerId: identity.nullable(),
    dueOn: calendarDate.nullable(),
    status: z.enum([
      "on_track",
      "at_risk",
      "off_track",
      "achieved",
      "partial",
      "missed",
      "dropped",
    ]),
    progress: z.enum([
      "manual",
      "task_completion",
      "project_task_completion",
      "project_milestone_completion",
      "task_list_completion",
      "subgoal_percentage",
      "subgoal_total",
    ]),
    current: z.number().min(-1000000).max(1000000),
    target: z.number().min(-1000000).max(1000000),
    unit: z.string().min(1).max(100),
    startValue: z.number().optional(),
    direction: z.enum(["increase", "decrease"]).optional(),
    followers: z.array(identity).max(1000).optional(),
    reminder: z
      .object({
        cadence: z.enum(["weekly", "biweekly", "monthly", "quarterly"]),
        anchorOn: calendarDate,
        time: z.string().regex(/^\d{2}:\d{2}$/),
        timeZone: z.string().max(100),
      })
      .strict()
      .nullable()
      .optional(),
    timeZone: z.string().max(100).optional(),
    subgoalIds: ids.optional(),
    taskIds: ids.optional(),
    startOn: calendarDate.nullable().optional(),
    timePeriod: z.string().max(100).optional(),
    goalType: z.enum(["company", "team", "individual"]).optional(),
    weightMode: z.enum(["equal", "custom"]).optional(),
    weights: z
      .array(
        z
          .object({ sourceId: plannerId, weight: z.number().min(0).max(100) })
          .strict(),
      )
      .max(100)
      .optional(),
  })
  .strict();
const personalRule = z
  .object({
    id: plannerId,
    name: z.string().min(1).max(200),
    enabled: z.boolean(),
    trigger: z.enum(["due_approaching", "overdue"]),
    schedule: z
      .object({
        amount: z.number().min(0),
        unit: z.enum(["days", "hours", "minutes"]),
      })
      .strict(),
    sectionId: plannerId.nullable().optional(),
    notify: z.boolean(),
  })
  .strict();
const myTasks = z
  .object({
    sections: z
      .array(
        z.object({ id: plannerId, name: z.string().min(1).max(200) }).strict(),
      )
      .max(100),
    placements: z
      .array(
        z
          .object({
            taskId: plannerId,
            sectionId: plannerId.nullable(),
            position: z.number().int().min(0),
          })
          .strict(),
      )
      .max(20000),
    rules: z.array(personalRule).max(100).optional(),
  })
  .strict();
const rule = z
  .object({
    enabled: z.boolean(),
    trigger: z.enum([
      "created",
      "status_changed",
      "section_changed",
      "priority_changed",
      "due_approaching",
      "overdue",
    ]),
    schedule: z
      .object({
        amount: z.number().nonnegative(),
        unit: z.enum(["days", "hours", "minutes"]),
      })
      .strict()
      .optional(),
    conditions: z
      .object({
        status: taskStatus.optional(),
        priority: priority.optional(),
        sectionId: plannerId.nullable().optional(),
      })
      .strict(),
    actions: z
      .object({
        status: taskStatus.optional(),
        priority: priority.optional(),
        sectionId: plannerId.nullable().optional(),
        assigneeId: identity.nullable().optional(),
        notify: z.boolean().optional(),
      })
      .strict(),
  })
  .strict();
export const plannerFormField = z
  .object({
    id: plannerId,
    label: z.string().min(1).max(500),
    description: z.string().optional(),
    type: z.enum([
      "text",
      "paragraph",
      "email",
      "date",
      "number",
      "select",
      "multi_select",
      "attachment",
    ]),
    required: z.boolean(),
    options: z.array(z.string()).max(100),
    showWhen: z
      .object({ questionId: plannerId, values: z.array(z.string()) })
      .strict()
      .optional(),
    multiple: z.boolean().optional(),
    maxLength: z.number().int().positive().optional(),
    taskField: z
      .enum([
        "name",
        "description",
        "startOn",
        "dueOn",
        "priority",
        "estimateMinutes",
        "custom",
        "attachments",
      ])
      .nullable(),
    customFieldId: plannerId.optional(),
  })
  .strict();
const form = z
  .object({
    description: z.string().max(50000),
    enabled: z.boolean(),
    fields: z.array(plannerFormField).max(100),
    defaults: z
      .object({
        assigneeId: identity.nullable(),
        priority,
        status: taskStatus,
        estimateMinutes: z.number().int().nonnegative(),
      })
      .strict(),
    sectionId: plannerId.nullable().optional(),
    titleFieldId: plannerId.nullable().optional(),
    copyAnswersToDescription: z.boolean().optional(),
    confirmationMessage: z.string().optional(),
    allowAnotherSubmission: z.boolean().optional(),
    addSubmitterAsCollaborator: z.boolean().optional(),
    audience: z.enum(["organization", "public"]).optional(),
  })
  .strict();
const template = z
  .object({
    ...sharing,
    project: projectData,
    tasks: z.array(taskData).max(1000),
    layout: z
      .array(
        z
          .object({
            sectionId: plannerId.nullable(),
            parentIndex: z.number().int().nullable(),
            dependencyIndices: z.array(z.number().int()),
          })
          .strict(),
      )
      .optional(),
    schedule: z
      .object({
        anchor: z.enum(["start", "due"]),
        skipWeekends: z.boolean(),
        dates: z.array(
          z
            .object({
              startOffset: z.number().nullable(),
              dueOffset: z.number().nullable(),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
  })
  .strict();
const chart = z
  .object({
    entity: z.enum(["tasks", "projects", "goals", "portfolios"]),
    metric: z.enum([
      "count",
      "estimated_minutes",
      "actual_minutes",
      "progress",
      "project_count",
      "custom_number",
    ]),
    group: z.enum([
      "none",
      "status",
      "owner",
      "assignee",
      "priority",
      "type",
      "project",
      "tag",
      "custom",
      "created",
      "due",
      "completed",
      "period",
    ]),
    groupFieldId: plannerId.nullable(),
    metricFieldId: plannerId.nullable(),
    granularity: z.enum(["day", "week", "month", "quarter", "year"]),
    filters: z
      .object({
        source: z
          .object({ kind: z.enum(["all", "projects", "portfolios"]), ids })
          .strict(),
        statuses: z.array(z.string()),
        personIds: z.array(identity),
        priorities: z.array(z.string()),
        types: z.array(z.string()),
        tags: z.array(z.string()),
        includeSubtasks: z.boolean(),
        dateField: z.enum(["created", "start", "due", "completed"]),
        from: calendarDate.nullable(),
        through: calendarDate.nullable(),
        timeZone: z.string().max(100),
        custom: z.array(
          z
            .object({
              fieldId: plannerId,
              values: z.array(z.union([z.string(), z.number()])),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();
const widget = z.discriminatedUnion("kind", [
  z
    .object({
      id: plannerId,
      kind: z.literal("text"),
      title: z.string().max(500),
      text: z.string().max(50000),
    })
    .strict(),
  z
    .object({
      id: plannerId,
      kind: z.literal("chart"),
      title: z.string().max(500),
      style: z.enum(["bar", "donut", "line", "number"]),
      labels: z.boolean(),
      chart,
    })
    .strict(),
]);
const dashboard = z
  .object({ ...sharing, widgets: z.array(widget).max(100) })
  .strict();
const savedView = z
  .object({
    scope: z.enum(["mine", "project"]),
    projectId: plannerId.nullable(),
    view: z.enum(["list", "board", "calendar", "timeline", "gantt"]),
    search: z.string().max(200),
    status: z.string().max(100),
    assigneeId: z.string().max(200),
    priority: z.string().max(100),
    sort: z.enum([
      "position",
      "due",
      "name",
      "priority",
      "estimated",
      "actual",
    ]),
    groupBy: z
      .enum(["section", "status", "priority", "assignee", "none"])
      .optional(),
  })
  .strict();
const viewPreferences = z
  .object({
    scope: z.enum(["mine", "project"]),
    projectId: plannerId.nullable(),
    view: z.enum(["list", "board", "timeline", "gantt"]),
    expandedTaskIds: ids,
    collapsedGroupIds: z.array(z.string()).max(1000),
    hideUnscheduled: z.boolean(),
  })
  .strict();
const capacity = z
  .object({
    userId: identity,
    weeklyMinutes: z.number().int().min(0).max(10080),
  })
  .strict();
export const resourceDataSchema = z.union([
  portfolio,
  goal,
  myTasks,
  rule,
  form,
  template,
  dashboard,
  savedView,
  viewPreferences,
  capacity,
]);
export const resourcePatchSchema = z.union([
  portfolio.partial(),
  goal.partial(),
  myTasks.partial(),
  rule.partial(),
  form.partial(),
  template.partial(),
  dashboard.partial(),
  savedView.partial(),
  viewPreferences.partial(),
  capacity.partial(),
]);

export const resourceDataSchemas = {
  portfolio,
  goal,
  template,
  rule,
  form,
  saved_view: savedView,
  view_preferences: viewPreferences,
  capacity,
  my_tasks: myTasks,
  dashboard,
} as const;
