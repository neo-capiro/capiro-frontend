import { z } from "zod";
import { defineOperation } from "../../contracts";
import { nullable, pageQuery, paginated, recordParams } from "./schemas";

const source =
  "apps/api/src/program-element/programs/programs.controller.ts + programs.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const peSource =
  "apps/api/src/program-element/program-element.controller.ts + program-element-read.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const reconciliation = z.object({
  id: z.string(),
  peCode: z.string(),
  fy: z.number(),
  fieldName: z.string(),
  currentValue: nullable,
  conflictingSource: z.string(),
  conflictingValue: nullable,
  deltaPct: z.union([z.number(), z.string()]).nullable(),
  queuedAt: z.string(),
  status: z.string(),
  resolutionNotes: nullable.optional(),
  resolvedAt: nullable.optional(),
  proposedOverrideId: nullable.optional(),
  proposedValue: nullable.optional(),
  resolvedByUserId: nullable.optional(),
});
export const analystReconciliationOperations = {
  "settings.analyst.reconciliation.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements/admin/reconciliation-queue",
    request: z.object({ query: pageQuery.optional() }).strict(),
    response: paginated(reconciliation),
    source: peSource,
  }),
  "settings.analyst.reconciliation.resolve": defineOperation({
    service: "core",
    method: "POST",
    path: "/program-elements/admin/reconciliation-queue/:id/resolve",
    request: z
      .object({
        params: recordParams,
        body: z
          .object({
            decision: z.enum([
              "keep_current",
              "accept_conflicting",
              "manual_value",
            ]),
            manualValue: z
              .string()
              .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
              .optional(),
            notes: z.string().max(10000).optional(),
          })
          .strict()
          .refine(
            (body) =>
              body.decision !== "manual_value" ||
              body.manualValue !== undefined,
          ),
      })
      .strict(),
    response: z.object({
      resolved: z.boolean(),
      pendingApproval: z.boolean(),
      id: z.string(),
      decision: z.string(),
      peCode: z.string(),
      fy: z.number(),
      fieldName: z.string(),
      proposedValue: nullable,
      proposedOverrideId: nullable,
    }),
    source: peSource,
  }),
  "settings.analyst.reconciliation.approve": defineOperation({
    service: "core",
    method: "POST",
    path: "/program-elements/admin/reconciliation-queue/:id/approve",
    request: z.object({ params: recordParams }).strict(),
    response: z.object({
      approved: z.literal(true),
      id: z.string(),
      overrideId: z.string(),
      peCode: z.string(),
      fy: z.number(),
      fieldName: z.string(),
    }),
    source: peSource,
  }),
} as const;
