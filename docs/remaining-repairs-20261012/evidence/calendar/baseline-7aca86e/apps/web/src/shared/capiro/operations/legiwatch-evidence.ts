import { z } from "zod";
import { defineOperation } from "../contracts";
import { budgetComparison, budgetPage } from "./legiwatch-budget-schemas";
import {
  configureMonitorBody,
  evidenceId,
  evidenceScope,
  evidenceSource,
  evidenceTrackBody,
  newsImportBody,
  newsImportPreview,
  newsImportReceipt,
  newsMonitor,
  newsPage,
  personnelItem,
  trackingReceipt,
} from "./legiwatch-evidence-schemas";

const source =
  "apps/intel-api/src/tracker/editorial/editorial.controller.ts + evidence.service.ts + publisher-coverage.ts; packages/shared/src/legiwatch-phase8.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const empty = z.object({}).strict();
const params = z.object({ id: evidenceId }).strict();
const pageOffset = z.number().int().min(0).max(10000).optional();
export const legiwatchEvidenceOperations = {
  "legiwatch.evidence.news": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/news",
    request: z
      .object({
        query: evidenceScope
          .extend({
            q: z.string().max(500).optional(),
            publisher: z.string().max(200).optional(),
            monitorId: evidenceId.optional(),
            days: z
              .union([z.literal(1), z.literal(3), z.literal(7), z.literal(14)])
              .optional(),
            limit: z.number().int().min(1).max(100).optional(),
            offset: pageOffset,
          })
          .strict(),
      })
      .strict(),
    response: newsPage,
    source,
  }),
  "legiwatch.evidence.source": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/source/:kind/:id",
    request: z
      .object({
        params: z
          .object({
            kind: z.enum(["news", "budget", "personnel", "research"]),
            id: evidenceId,
          })
          .strict(),
        query: evidenceScope.optional(),
      })
      .strict(),
    response: evidenceSource,
    source,
  }),
  "legiwatch.evidence.monitors": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/news/monitors",
    request: empty,
    response: z.object({ monitors: z.array(newsMonitor) }),
    source,
  }),
  "legiwatch.evidence.monitor.configure": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/news/monitors/:id/configure",
    request: z.object({ params, body: configureMonitorBody }).strict(),
    response: z.array(newsMonitor),
    source,
  }),
  "legiwatch.evidence.monitor.scan": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/news/monitors/:id/scan",
    request: z.object({ params }).strict(),
    response: z.object({
      state: z.enum(["waiting_for_first_window", "complete", "partial"]),
      matches: z.number().int(),
      reason: z.string().nullable().optional(),
      cutoff: z.string().optional(),
    }),
    timeoutMs: 600000,
    source,
  }),
  "legiwatch.evidence.personnel": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/personnel",
    request: z
      .object({
        query: evidenceScope
          .extend({
            year: z.number().int().min(1900).max(2200),
            kind: z.enum(["change", "registration"]),
            branch: z.enum(["", "legislative", "executive"]).optional(),
            q: z.string().max(200).optional(),
            offset: pageOffset,
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      items: z.array(personnelItem),
      nextOffset: z.number().int().nullable(),
      year: z.number().int(),
      notice: z.string(),
    }),
    source,
  }),
  "legiwatch.evidence.track": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/track",
    request: z.object({ body: evidenceTrackBody }).strict(),
    response: trackingReceipt,
    source,
  }),
  "legiwatch.evidence.import.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/imports/preview",
    request: z.object({ body: newsImportBody }).strict(),
    response: newsImportPreview,
    source,
  }),
  "legiwatch.evidence.import.stage": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/imports/stage",
    request: z
      .object({
        body: newsImportBody
          .safeExtend({ requestKey: z.string().min(8).max(180) })
          .strict(),
      })
      .strict(),
    response: newsImportReceipt,
    source,
  }),
  "legiwatch.evidence.budget": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/budget",
    request: z
      .object({
        query: evidenceScope
          .extend({
            fiscalYear: z.string().regex(/^20\d{2}-\d{2}$/),
            q: z.string().max(200).optional(),
            projectId: evidenceId.optional(),
            offset: pageOffset,
          })
          .strict(),
      })
      .strict(),
    response: budgetPage,
    source,
  }),
  "legiwatch.evidence.budget.compare": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/budget/compare",
    request: z
      .object({
        body: evidenceScope
          .extend({
            leftId: evidenceId,
            rightId: evidenceId,
            leftRevision: z.string().min(1).max(200),
            rightRevision: z.string().min(1).max(200),
          })
          .strict()
          .refine((body) => body.leftId !== body.rightId, {
            message: "Select two distinct observations.",
          }),
      })
      .strict(),
    response: budgetComparison,
    source,
  }),
} as const;
