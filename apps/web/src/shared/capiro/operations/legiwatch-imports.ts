import { z } from "zod";
import { defineOperation } from "../contracts";
import { monitorParams } from "./legiwatch-monitor-schemas";
const source =
  "apps/intel-api/src/tracker/folders/folder-import.controller.ts; folder-import.dto.ts; folder-import.service.ts; tracker/reports/report.controller.ts; tracker/reports/record-rule.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
/** Captured source evidence is data, not executable configuration. Bound depth before schema recursion. */
export const capturedImportJson = z.custom<Record<string, unknown>>((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const pending: Array<{ value: unknown; depth: number }> = [
    { value, depth: 0 },
  ];
  let count = 0;
  while (pending.length) {
    const item = pending.pop()!;
    if (++count > 20000 || item.depth > 12) return false;
    if (item.value === null || typeof item.value === "boolean") continue;
    if (typeof item.value === "string") {
      if (item.value.length > 50000) return false;
      continue;
    }
    if (typeof item.value === "number") {
      if (!Number.isFinite(item.value)) return false;
      continue;
    }
    if (typeof item.value !== "object") return false;
    const entries = Object.entries(item.value);
    if (
      entries.length > 1000 ||
      entries.some(([key]) =>
        ["__proto__", "constructor", "prototype"].includes(key),
      )
    )
      return false;
    for (const [, value] of entries)
      pending.push({ value, depth: item.depth + 1 });
  }
  return true;
}, "The capture must be bounded JSON source data.");
export const importRun = z.object({
  id: z.string(),
  sourceAccount: z.string(),
  captureId: z.string(),
  sourceHash: z.string(),
  mappingHash: z.string(),
  status: z.string(),
  createdAt: z.string(),
});
const item = z.object({
  id: z.string(),
  kind: z.string(),
  sourceId: z.string(),
  status: z.string(),
  reason: z.string().nullable(),
  targetId: z.string().nullable(),
});
export const importReview = z.object({
  run: importRun,
  counts: z.array(
    z.object({
      kind: z.string(),
      status: z.string(),
      _count: z.object({ _all: z.number() }),
    }),
  ),
  items: z.array(item),
  nextOffset: z.number().nullable(),
  alertsActivated: z.literal(false),
  usersProvisioned: z.literal(false),
});
const kind = z.enum([
  "folder",
  "assignment",
  "report",
  "alert",
  "bill_keyword",
  "news_keyword",
  "user",
  "contact",
  "mailing_list",
  "list_membership",
  "statute",
  "committee_legislator",
  "alert_target",
  "alert_channel",
  "report_observation",
]);
export const importPreviewBody = z
  .object({
    targetTenantId: z.uuid(),
    sourceAccount: z.string().regex(/^[a-zA-Z0-9:_-]{3,120}$/),
    captureId: z.string().min(1).max(120),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
    mappingManifest: capturedImportJson.refine(
      (value) => JSON.stringify(value).length <= 64000,
    ),
    items: z
      .array(
        z
          .object({
            kind,
            sourceId: z.string().min(1).max(200),
            payload: capturedImportJson,
            excludedReason: z.string().max(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100)
      .refine((value) => JSON.stringify(value).length <= 1000000),
  })
  .strict()
  .refine(
    (value) =>
      value.mappingManifest.tenantId === value.targetTenantId &&
      value.mappingManifest.sourceAccount === value.sourceAccount &&
      "sourceTimezone" in value.mappingManifest,
    "Capture and mapping manifest must name the same workspace and source account.",
  );
const applyBody = z
  .object({
    targetTenantId: z.uuid(),
    mappingHash: z.string().regex(/^[a-f0-9]{64}$/),
    itemIds: z.array(z.uuid()).min(1).max(100),
  })
  .strict();
const params = z.object({ params: monitorParams }).strict();
const promotion = z.object({
  id: z.string().optional(),
  targetId: z.string().optional(),
  state: z.string(),
  reason: z.string().optional(),
  candidates: z.array(z.string()).optional(),
  sourceChanged: z.boolean().optional(),
});
export const legiwatchImportOperations = {
  "legiwatch.imports": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/folder-imports",
    request: z.object({}).strict(),
    response: z.array(importRun),
    source,
  }),
  "legiwatch.import.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folder-imports/preview",
    request: z.object({ body: importPreviewBody }).strict(),
    response: importReview,
    source,
  }),
  "legiwatch.import.review": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/folder-imports/:id",
    request: z
      .object({
        params: monitorParams,
        query: z.object({ offset: z.number().int().nonnegative() }).strict(),
      })
      .strict(),
    response: importReview,
    source,
  }),
  "legiwatch.import.item": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/folder-imports/:id/items/:itemId",
    request: z
      .object({
        params: monitorParams
          .extend({ itemId: z.string().min(1).max(180) })
          .strict(),
      })
      .strict(),
    response: item.extend({
      payload: z.object({
        raw: capturedImportJson,
        rawHash: z.string(),
        resolved: capturedImportJson,
        sourceTimezone: z.string().nullable().optional(),
      }),
    }),
    source,
  }),
  "legiwatch.import.apply": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folder-imports/:id/apply",
    request: z.object({ params: monitorParams, body: applyBody }).strict(),
    response: importReview,
    timeoutMs: 180000,
    source,
  }),
  "legiwatch.import.compensate": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folder-imports/:id/compensate",
    request: z.object({ params: monitorParams, body: applyBody }).strict(),
    response: importReview,
    timeoutMs: 180000,
    source,
  }),
  "legiwatch.import.pause": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folder-imports/:id/pause",
    request: params,
    response: z.object({ paused: z.boolean() }),
    source,
  }),
  "legiwatch.import.resume": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/folder-imports/:id/resume",
    request: params,
    response: z.object({ paused: z.boolean() }),
    source,
  }),
  "legiwatch.import.report.promote": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/reports/promote/:id",
    request: params,
    response: promotion,
    source,
  }),
  "legiwatch.import.record.promote": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/reports/rules/promote/:id",
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            existingRuleId: z.string().max(180).optional(),
            confirmNewDefinition: z.boolean(),
            userMappings: z.record(z.string().max(180), z.string().max(180)),
          })
          .strict(),
      })
      .strict(),
    response: promotion,
    source,
  }),
  "legiwatch.import.agenda.promote": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/agenda-rules/promote/:id",
    request: z
      .object({
        params: monitorParams,
        body: z
          .object({
            existingRuleId: z.string().max(180).optional(),
            confirmNewDefinition: z.boolean(),
            userMappings: z.record(z.string().max(180), z.string().max(180)),
          })
          .strict(),
      })
      .strict(),
    response: promotion,
    source,
  }),
} as const;
