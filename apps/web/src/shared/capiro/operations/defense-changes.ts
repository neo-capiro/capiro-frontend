import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "capiro-backend@d9a39916f program-element.controller.ts / program-element-read.service.ts; defense-budget-client-watch.controller.ts / service.ts; Prisma ProgramElementDelta, DefenseBudgetClientWatch/Event";
const pe = z.string().trim().min(1).max(16);
const fy = z.number().int().min(2000).max(2100).optional();
const decimal = z
  .string()
  .regex(/^-?\d+(?:\.\d+)?$/)
  .nullable();
export const budgetChange = z.object({
  id: z.string(),
  peCode: z.string(),
  assertedFy: z.number().int(),
  deltaType: z.string(),
  fromRef: z.string().nullable(),
  toRef: z.string().nullable(),
  amountFrom: decimal,
  amountTo: decimal,
  deltaAbs: decimal,
  deltaPct: z.number().nullable(),
  explanation: z.string().nullable(),
  materialityScore: z.number(),
  computedAt: z.string(),
});
const event = z.object({
  id: z.string(),
  clientId: z.uuid(),
  watchId: z.string(),
  eventType: z.string(),
  updateEventId: z.string().nullable(),
  materialReason: z.string().nullable(),
  createdAt: z.string(),
});
export const clientDefenseWatch = z.object({
  id: z.string(),
  clientId: z.uuid(),
  targetType: z.enum(["program", "pe", "project", "capability"]),
  targetKey: z.string(),
  clientReason: z.string(),
  createdAt: z.string(),
  events: z.array(event),
});
export const defenseChangesOperations = {
  "defenseChanges.attention": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements/deltas/needs-attention",
    source,
    request: z
      .object({
        query: z
          .object({
            fy,
            minScore: z.number().min(0).max(1),
            limit: z.number().int().min(1).max(100),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      data: z.array(budgetChange),
      total: z.number().int(),
      minScore: z.number(),
    }),
  }),
  "defenseChanges.budget": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements/:peCode/deltas",
    source,
    request: z
      .object({
        params: z.object({ peCode: pe }).strict(),
        query: z
          .object({
            fy,
            page: z.number().int().min(1),
            limit: z.number().int().min(1).max(100),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      data: z.array(budgetChange),
      total: z.number().int(),
      page: z.number().int(),
      limit: z.number().int(),
    }),
  }),
  "defenseChanges.congressional": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements/:peCode/bill-actions",
    source,
    request: z.object({ params: z.object({ peCode: pe }).strict() }).strict(),
    response: z.object({
      billCount: z.number().int(),
      data: z.array(
        z.object({
          billId: z.string(),
          congress: z.number().int(),
          billType: z.string(),
          billNumber: z.string(),
          billTitle: z.string(),
          peCodeCount: z.number().int(),
          date: z.string(),
          text: z.string(),
          type: z.string().nullable(),
          chamber: z.string().nullable(),
          stage: z.string(),
          stageLabel: z.string(),
          stageRank: z.number(),
        }),
      ),
    }),
  }),
  "defenseChanges.monitored": defineOperation({
    service: "core",
    method: "GET",
    path: "/clients/:clientId/defense-budget-watches",
    source,
    request: z
      .object({ params: z.object({ clientId: z.uuid() }).strict() })
      .strict(),
    response: z.array(clientDefenseWatch),
  }),
} as const;
