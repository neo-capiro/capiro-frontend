import { z } from "zod";
import { defineOperation } from "../../contracts";
import {
  auditSchema,
  empty,
  paginated,
  quarantineSchema,
  recordParams,
  reviewCountsSchema,
} from "./schemas";

const source =
  "apps/api/src/program-element/programs/programs.controller.ts + programs.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const adminSource =
  "apps/api/src/capiro-admin/capiro-admin.controller.ts + capiro-admin.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const analystAuditOperations = {
  "settings.analyst.counts": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/review-counts",
    request: empty,
    response: reviewCountsSchema,
    source: adminSource,
  }),
  "settings.analyst.quarantine.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/quarantine",
    request: z
      .object({
        query: z
          .object({
            type: z.enum(["program_element", "acquisition_personnel"]),
            source: z.string().max(200).optional(),
            page: z.number().int().min(1).optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict(),
      })
      .strict(),
    response: paginated(quarantineSchema),
    source: adminSource,
  }),
  "settings.analyst.quarantine.discard": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/quarantine/:type/:id/discard",
    request: z
      .object({
        params: recordParams
          .extend({
            type: z.enum(["program_element", "acquisition_personnel"]),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ discarded: z.literal(true) }),
    source: adminSource,
  }),
  "settings.analyst.quarantine.reprocess": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/quarantine/:type/:id/reprocess",
    request: z
      .object({
        params: recordParams
          .extend({
            type: z.enum(["program_element", "acquisition_personnel"]),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      reprocessed: z.literal(true),
      accepted: z.boolean(),
      reason: z.string().optional(),
    }),
    source: adminSource,
  }),
  "settings.analyst.audit.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/audit-logs",
    request: z
      .object({
        query: z
          .object({
            action: z.string().min(1).max(200).optional(),
            entityType: z.string().min(1).max(200).optional(),
            actorUserId: z.uuid().optional(),
            from: z.iso.datetime().optional(),
            to: z.iso.datetime().optional(),
            page: z.number().int().min(1).optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: paginated(auditSchema),
    source: adminSource,
  }),
} as const;
