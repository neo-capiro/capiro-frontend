import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  keywordBody,
  keywordPreview,
  keywordRule,
  keywordScan,
  keywordScope,
  keywordSuggestion,
} from "./legiwatch-keyword-schemas";
import {
  monitorId,
  monitorParams,
  monitorVersion,
  staffRecipient,
} from "./legiwatch-monitor-schemas";
const source =
  "apps/intel-api/src/tracker/keywords/keyword.controller.ts; keyword-rule.service.ts; keyword-domain.ts; keyword-discovery.service.ts; keyword-delivery.service.ts; sourcedata/keyword-source.repository.ts; packages/shared/src/legiwatch-query.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const base = "/legiwatch/keyword-rules",
  params = z.object({ params: monitorParams }).strict();
const decision = z
  .object({
    requestKey: z.string().min(8).max(180),
    expectedVersion: monitorVersion,
    action: z.enum(["add", "dismiss", "exclude", "restore", "undo"]),
  })
  .strict();
const captured = z.object({
  id: z.string(),
  sourceId: z.string(),
  version: z.number(),
  payload: z.object({
    name: z.string().optional(),
    family: z.string().optional(),
    audit_key: z.string().optional(),
    user_id: z.union([z.string(), z.number()]).optional(),
    alert_key: z.string().optional(),
    email_selected: z.boolean().optional(),
    notification_selected: z.boolean().optional(),
  }),
});
export const legiwatchKeywordOperations = {
  "legiwatch.keyword.staged": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/staged`,
    request: z
      .object({
        query: z.object({ sourceAccount: z.string().min(3).max(120) }).strict(),
      })
      .strict(),
    response: z.object({
      actorId: z.string(),
      currentStaff: z.array(
        z.object({ userId: z.string(), email: z.string() }),
      ),
      rules: z.array(captured.extend({ sourceHash: z.string() })),
      channels: z.array(captured),
      definitions: z.array(
        z.object({
          id: z.string(),
          sourceId: z.string(),
          version: z.number(),
          sourceHash: z.string(),
          raw: z.object({ exactKeyword: z.string().optional() }),
          state: z.string(),
        }),
      ),
      counts: z.object({ definitions: z.number(), rules: z.number() }),
    }),
    source,
  }),
  "legiwatch.keyword.promote": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/promote/:id`,
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
            scope: keywordScope,
            existingRuleId: monitorId.optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ id: z.string(), state: z.string() }),
    source,
  }),
  "legiwatch.keywords": defineOperation({
    service: "intelligence",
    method: "GET",
    path: base,
    request: z.object({}).strict(),
    response: z.array(keywordRule),
    source,
  }),
  "legiwatch.keyword.create": defineOperation({
    service: "intelligence",
    method: "POST",
    path: base,
    request: z.object({ body: keywordBody }).strict(),
    response: keywordRule,
    source,
  }),
  "legiwatch.keyword.save": defineOperation({
    service: "intelligence",
    method: "PUT",
    path: `${base}/:id`,
    request: z
      .object({
        params: monitorParams,
        body: keywordBody.extend({ expectedVersion: monitorVersion }).strict(),
      })
      .strict(),
    response: keywordRule,
    source,
  }),
  "legiwatch.keyword.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/preview`,
    request: z
      .object({
        body: z
          .object({
            scope: keywordScope,
            raw: z.string().max(4096),
            boundary: z.string().max(200).optional(),
            cursor: z.string().max(250).optional(),
          })
          .strict(),
      })
      .strict(),
    response: keywordPreview,
    source,
  }),
  "legiwatch.keyword.scan.start": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/scans`,
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            requestKey: z.string().min(8).max(180),
            mode: z.enum(["preview", "active"]),
          })
          .strict(),
      })
      .strict(),
    response: keywordScan,
    source,
  }),
  "legiwatch.keyword.scan.read": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/scans/:id`,
    request: params,
    response: keywordScan,
    source,
  }),
  "legiwatch.keyword.scan.continue": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/scans/:id/continue`,
    request: params,
    response: keywordScan,
    timeoutMs: 180000,
    source,
  }),
  "legiwatch.keyword.history": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/:id/history`,
    request: params,
    response: z.array(keywordScan),
    source,
  }),
  "legiwatch.keyword.activation": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/activation`,
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            action: z.enum(["activate", "pause"]),
            baseline: z.literal("from_now"),
            previewRunId: monitorId.optional(),
          })
          .strict()
          .refine(
            (value) => value.action === "pause" || Boolean(value.previewRunId),
          ),
      })
      .strict(),
    response: keywordRule,
    source,
  }),
  "legiwatch.keyword.suggestions": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/suggestions/:id`,
    request: z
      .object({
        params: monitorParams,
        query: keywordScope
          .omit({ fields: true })
          .extend({ cursor: z.string().max(250).optional() })
          .strict(),
      })
      .strict(),
    response: z.object({
      rows: z.array(keywordSuggestion),
      next: z.string().nullable(),
    }),
    source,
  }),
  "legiwatch.keyword.decision": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/suggestions/:id/decision`,
    request: z.object({ params: monitorParams, body: decision }).strict(),
    response: z.object({
      outcome: z.string(),
      payload: z.object({
        suggestionId: z.string(),
        version: z.number(),
        action: z.string(),
        decisionId: z.string().nullable(),
      }),
    }),
    source,
  }),
  "legiwatch.keyword.mappings": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/mappings`,
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            reviewedOwnerId: monitorId,
            ownerReviewed: z.literal(true),
            userMappings: z.record(z.string().max(200), monitorId),
            recipients: z.array(staffRecipient).max(50),
          })
          .strict(),
      })
      .strict(),
    response: keywordRule,
    source,
  }),
  "legiwatch.keyword.delivery.preview": defineOperation({
    service: "intelligence",
    method: "GET",
    path: `${base}/:id/delivery-preview`,
    request: params,
    response: z.object({
      ruleId: z.string(),
      version: z.number(),
      issues: z.array(z.string()),
      previewHash: z.string(),
      recipientCount: z.number(),
    }),
    source,
  }),
  "legiwatch.keyword.delivery.activate": defineOperation({
    service: "intelligence",
    method: "POST",
    path: `${base}/:id/delivery`,
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            expectedVersion: monitorVersion,
            enabled: z.boolean(),
            previewHash: z.string().max(200).optional(),
          })
          .strict()
          .refine((value) => !value.enabled || Boolean(value.previewHash)),
      })
      .strict(),
    response: z.object({ id: z.string(), enabled: z.boolean() }),
    source,
  }),
} as const;
