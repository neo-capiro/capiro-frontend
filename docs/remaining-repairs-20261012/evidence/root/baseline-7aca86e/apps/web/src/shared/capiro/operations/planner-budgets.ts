import { z } from "zod";
import { defineOperation } from "../contracts";
import { identity, plannerId, recordParams } from "./planner-schemas";
const source =
  "capirov2@4be13b0 planner.controller.ts + planner.service.ts:3140-3265 + strategy-verifier/planner-budgets.ts";
const minor = z.string().regex(/^\d+$/);
const rate = z
  .object({ userId: identity, name: z.string(), hourlyMinor: minor })
  .strict();
const data = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    measurement: z.enum(["time", "cost"]),
    budgetMinutes: z.number().int().nonnegative().nullable(),
    budgetMinor: minor.nullable(),
    actualFilter: z.enum(["all", "billable", "nonbillable"]),
    rates: z.array(rate).max(1000),
  })
  .strict();
const alert = z.object({
  version: z.number().int().nonnegative(),
  enabled: z.boolean(),
  percent: z.number().nonnegative(),
  comparison: z.enum(["budget", "estimate"]),
});
export const budget = z.object({
  projectId: plannerId,
  projectName: z.string(),
  version: z.number().int().nonnegative(),
  data,
  alert,
  estimatedMinutes: z.number(),
  actualMinutes: z.number(),
  billableMinutes: z.number(),
  nonbillableMinutes: z.number(),
  estimatedMinor: minor,
  actualMinor: minor,
  unratedEstimatedMinutes: z.number(),
  unratedActualMinutes: z.number(),
  people: z.array(
    z.object({
      userId: identity.nullable(),
      name: z.string(),
      active: z.boolean(),
      hourlyMinor: minor.nullable(),
      estimatedMinutes: z.number(),
      actualMinutes: z.number(),
      estimatedMinor: minor.nullable(),
      actualMinor: minor.nullable(),
    }),
  ),
});
export const plannerBudgetOperations = {
  "planner.project.budget": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/planner/projects/:id/budget",
    request: z.object({ params: recordParams }).strict(),
    response: budget,
    source,
  }),
  "planner.project.budget.update": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/projects/:id/budget",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            version: z.number().int().nonnegative(),
            data: data.partial(),
          })
          .strict(),
      })
      .strict(),
    response: budget,
    source,
  }),
  "planner.project.budget.alert": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/planner/projects/:id/budget/alert",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            version: z.number().int().nonnegative(),
            data: alert.omit({ version: true }).strict(),
          })
          .strict(),
      })
      .strict(),
    response: budget,
    source,
  }),
};
