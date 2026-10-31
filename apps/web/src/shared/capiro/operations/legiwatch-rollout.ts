import { z } from "zod";
import { defineOperation } from "../contracts";
import { legiwatchDeliveryOperations as delivery } from "./legiwatch-delivery";

/** Cached clients retain these operation names through the frontend rollback
 * window. They dispatch only to retained delivery owners and the read-only
 * briefing picker. Remove after that window; no Reports UI or writes return.
 */
export const legiwatchRolloutOperations = {
  "legiwatch.report.run": delivery["legiwatch.delivery.run"],
  "legiwatch.report.recipients": delivery["legiwatch.delivery.recipients"],
  "legiwatch.report.compose": delivery["legiwatch.delivery.compose"],
  "legiwatch.report.send": delivery["legiwatch.delivery.send"],
  "legiwatch.report.deliveries": delivery["legiwatch.delivery.history"],
  "legiwatch.report.history": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/reports/history",
    request: z
      .object({
        query: z
          .object({
            reportId: z.string().optional(),
            before: z.iso.datetime().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(
      z.object({
        id: z.string(),
        reportId: z.string(),
        definitionVersion: z.number(),
        audience: z.string(),
        cutoff: z.string(),
        contentHash: z.string(),
        complete: z.boolean(),
        generatedAt: z.string(),
      }),
    ),
    source:
      "apps/intel-api/src/tracker/research/research-report.service.ts (temporary frozen research base picker)",
  }),
  "legiwatch.reports": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/reports",
    request: z.object({}).strict(),
    response: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        folderIds: z.array(z.string()),
        jurisdiction: z.string(),
        sessionKey: z.string(),
        settings: z.record(z.string(), z.unknown()),
        version: z.number(),
        archived: z.boolean(),
        canEdit: z.boolean(),
        sourceId: z.string().nullable(),
        lastGeneratedAt: z.string().nullable(),
      }),
    ),
    source:
      "apps/intel-api/src/tracker/delivery/briefing-rollout.controller.ts (temporary briefing picker)",
  }),
} as const;
