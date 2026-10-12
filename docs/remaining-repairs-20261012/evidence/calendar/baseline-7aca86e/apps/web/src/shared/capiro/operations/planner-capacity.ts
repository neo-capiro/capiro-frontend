import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  calendarDate,
  identity,
  plannerId,
  read,
  recordParams,
  version,
} from "./planner-schemas";
const source =
  "capirov2@4be13b0 planner-capacity.controller.ts + planner-capacity.service.ts + strategy-verifier/planner-capacity.ts";
const sharing = {
  privacy: z.enum(["private", "team"]),
  members: z
    .array(
      z
        .object({ userId: identity, role: z.enum(["admin", "viewer"]) })
        .strict(),
    )
    .max(1000),
};
const planData = z
  .object({
    ...sharing,
    description: z.string().max(50000),
    projectIds: z.array(plannerId).max(100),
    portfolioIds: z.array(plannerId).max(100),
    peopleIds: z.array(identity).max(1000),
    teamIds: z.array(plannerId).max(100),
    views: z
      .array(
        z
          .object({
            id: plannerId,
            name: z.string(),
            tab: z.enum(["people", "projects"]),
            zoom: z.enum(["day", "week", "month"]),
            unit: z.enum(["hours", "percent", "count", "personMonths"]),
            group: z.enum(["none", "team", "jobTitle", "health"]),
            search: z.string(),
            projectId: z.string(),
            personId: z.string(),
            startOn: z.string(),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();
const teamData = z
  .object({
    ...sharing,
    peopleIds: z.array(identity).max(1000),
    jobTitles: z.record(z.string(), z.string()),
  })
  .strict();
const placeholderData = z
  .object({
    teamId: plannerId,
    jobTitle: z.string().max(500),
    weeklyMinutes: z.number().int().min(0).max(10080),
  })
  .strict();
const capacityRecord = z.object({
  id: plannerId,
  name: z.string(),
  ownerId: identity,
  version,
  archived: z.boolean(),
  access: z.enum(["admin", "viewer"]),
  data: z
    .object({ ...planData.shape, ...teamData.shape, ...placeholderData.shape })
    .partial(),
});
const allocationData = z
  .object({
    userId: identity.nullable(),
    placeholderId: plannerId.nullable(),
    startOn: calendarDate,
    endOn: calendarDate,
    effort: z
      .object({
        unit: z.enum(["hours", "percent"]),
        value: z.number().nonnegative().max(1000000),
      })
      .strict(),
  })
  .strict();
const allocation = capacityRecord.extend({
  projectId: plannerId,
  projectName: z.string(),
  personName: z.string(),
  weeklyMinutes: z.number(),
  teamId: plannerId.nullable(),
  jobTitle: z.string(),
  data: allocationData,
});
const recordMutation = z.object({
  id: plannerId,
  name: z.string().trim().min(1).max(500),
  version: version.optional(),
  archived: z.boolean().optional(),
});
export const plannerCapacityOperations = {
  "planner.capacity": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/capacity",
    request: read,
    response: z.object({
      plans: z.array(capacityRecord.extend({ data: planData })),
      teams: z.array(capacityRecord.extend({ data: teamData })),
      placeholders: z.array(capacityRecord.extend({ data: placeholderData })),
    }),
    source,
  }),
  "planner.capacity.plan": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/capacity/plans/:id",
    request: z
      .object({
        params: recordParams,
        query: z
          .object({
            cursor: plannerId.optional(),
            revision: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
            archived: z.enum(["true", "false"]).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z
      .object({
        plan: capacityRecord.extend({ data: planData }),
        projectIds: z.array(plannerId),
        personIds: z.array(identity),
        allocations: z.array(allocation),
        matched: z.number(),
        revision: z.string(),
        nextCursor: plannerId.nullable(),
        weeklyCapacities: z
          .array(
            z.object({
              id: identity,
              weeklyMinutes: z.number(),
              canEdit: z.boolean(),
            }),
          )
          .optional(),
      })
      .strip(),
    source,
  }),
  "planner.capacity.plan.save": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/capacity/plans",
    request: z
      .object({ body: recordMutation.extend({ data: planData }).strict() })
      .strict(),
    response: capacityRecord,
    source,
  }),
  "planner.capacity.team.save": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/capacity/teams",
    request: z
      .object({ body: recordMutation.extend({ data: teamData }).strict() })
      .strict(),
    response: capacityRecord,
    source,
  }),
  "planner.capacity.allocation.save": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/capacity/allocations",
    request: z
      .object({
        body: z
          .object({
            planId: plannerId,
            planVersion: version,
            changes: z
              .array(
                z
                  .object({
                    id: plannerId,
                    version: version.optional(),
                    projectId: plannerId.optional(),
                    data: allocationData.partial().optional(),
                    archived: z.boolean().optional(),
                    shiftDays: z.number().int().min(-3660).max(3660).optional(),
                    duplicateId: plannerId.optional(),
                  })
                  .strict(),
              )
              .min(1)
              .max(100),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ allocations: z.array(allocation) }),
    source,
  }),
  "planner.capacity.placeholder.save": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/planner/capacity/placeholders",
    request: z
      .object({
        body: recordMutation.extend({ data: placeholderData }).strict(),
      })
      .strict(),
    response: capacityRecord,
    source,
  }),
};
