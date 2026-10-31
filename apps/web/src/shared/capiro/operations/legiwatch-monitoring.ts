import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  monitorParams,
  monitorVersion,
  recordReadiness,
  recordRule,
  recordRuleBody,
  statuteConfig,
  statuteMatch,
  statutePreview,
  statuteRule,
} from "./legiwatch-monitor-schemas";
const source =
  "apps/intel-api/src/tracker/delivery/record-rule.service.ts; delivery/delivery.controller.ts; calendar/agenda-rule.controller.ts; agenda-rule.service.ts; research/statute-monitor.service.ts; research/research.controller.ts; folders/folder-tracker.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const empty = z.object({}).strict(),
  params = z.object({ params: monitorParams }).strict();
/** Agenda rules inherit RecordRuleService; these four public operations share that exact contract. */
function recordOperations(
  path: "/legiwatch/monitoring/rules" | "/legiwatch/agenda-rules",
) {
  return {
    list: defineOperation({
      service: "intelligence",
      method: "GET",
      path,
      request: empty,
      response: z.array(recordRule),
      source,
    }),
    save: defineOperation({
      service: "intelligence",
      method: "PUT",
      path: `${path}/:id`,
      request: z
        .object({ params: monitorParams, body: recordRuleBody })
        .strict(),
      response: recordRule,
      source,
    }),
    readiness: defineOperation({
      service: "intelligence",
      method: "GET",
      path: `${path}/:id/readiness`,
      request: params,
      response: recordReadiness,
      source,
    }),
    activation: defineOperation({
      service: "intelligence",
      method: "POST",
      path: `${path}/:id/activation`,
      request: z
        .object({
          params: monitorParams,
          body: z
            .object({ expectedVersion: monitorVersion, enabled: z.boolean() })
            .strict(),
        })
        .strict(),
      response: recordRule,
      source,
    }),
  };
}
const record = recordOperations("/legiwatch/monitoring/rules"),
  agenda = recordOperations("/legiwatch/agenda-rules");
export const legiwatchMonitoringOperations = {
  "legiwatch.folder.members": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/folders/members",
    request: empty,
    response: z.object({
      members: z.array(z.object({ id: z.string(), name: z.string() })),
      currentActor: z.string(),
      canAssignOwner: z.boolean(),
    }),
    source,
  }),
  "legiwatch.rules.record": record.list,
  "legiwatch.rules.record.save": record.save,
  "legiwatch.rules.record.readiness": record.readiness,
  "legiwatch.rules.record.activation": record.activation,
  "legiwatch.rules.agenda": agenda.list,
  "legiwatch.rules.agenda.save": agenda.save,
  "legiwatch.rules.agenda.readiness": agenda.readiness,
  "legiwatch.rules.agenda.activation": agenda.activation,
  "legiwatch.statute.monitors": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/monitors",
    request: empty,
    response: z.array(statuteRule),
    source,
  }),
  "legiwatch.statute.configure": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/monitors/:id/configure",
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({ expectedVersion: monitorVersion, config: statuteConfig })
          .strict(),
      })
      .strict(),
    response: statuteRule,
    source,
  }),
  "legiwatch.statute.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/monitors/:id/preview",
    request: params,
    response: statutePreview,
    source,
  }),
  "legiwatch.statute.activation": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/monitors/:id/activation",
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            enabled: z.boolean(),
            baseline: z.literal("from_now").optional(),
            previewHash: z.string().max(200).optional(),
          })
          .strict()
          .refine(
            (body) =>
              !body.enabled ||
              Boolean(body.previewHash && body.baseline === "from_now"),
          ),
      })
      .strict(),
    response: z.object({
      state: z.string(),
      baselineMatches: z.number().optional(),
      deliveryActive: z.literal(false).optional(),
    }),
    source,
  }),
  "legiwatch.statute.scan": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/monitors/:id/scan",
    request: params,
    response: z.object({
      state: z.string(),
      gaps: z.array(z.string()).optional(),
      added: z.number().optional(),
      delivery: z.number().optional(),
      sourceManifest: z.string().nullable().optional(),
    }),
    timeoutMs: 180000,
    source,
  }),
  "legiwatch.statute.events": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/monitors/:id/events",
    request: params,
    response: z.array(
      z.object({
        id: z.string(),
        rule_version: z.number(),
        baseline: z.boolean(),
        payload: statuteMatch,
        created_at: z.string(),
      }),
    ),
    source,
  }),
} as const;
