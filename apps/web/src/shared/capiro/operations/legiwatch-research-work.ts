import { z } from "zod";
import { defineOperation } from "../contracts";
import { draftReceipt } from "./legiwatch-briefings";
import { researchScope } from "./legiwatch-research-schemas";
const source =
  "apps/intel-api/src/tracker/research/research.controller.ts; research.service.ts; research-deadline.service.ts; research-report.service.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const id = z.string().min(1).max(180);
const citation = z
  .object({
    documentId: id,
    revision: z.string().min(1).max(200),
    locator: z.string().min(1).max(2000),
    quote: z.string().min(1).max(5000),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .strict()
  .refine(
    (value) =>
      value.end > value.start && value.quote.length === value.end - value.start,
  );
// Cached research clients still bind an existing frozen internal base.
const review = z.object({ selectionId: id, runId: id.optional() }).strict();
export const legiwatchResearchWorkOperations = {
  "legiwatch.research.draft": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/drafts",
    request: z
      .object({
        body: researchScope
          .extend({
            requestKey: z.string().min(8).max(180),
            title: z.string().min(1).max(200),
            analysis: z.string().max(30000),
            documents: z
              .array(
                z
                  .object({
                    id,
                    revision: z.string().min(1).max(200),
                    sessionKey: z.string().max(60).optional(),
                  })
                  .strict(),
              )
              .min(1)
              .max(10),
            citations: z.array(citation).min(1).max(100),
            allowCrossBill: z.literal(false),
          })
          .strict(),
      })
      .strict(),
    response: draftReceipt,
    timeoutMs: 90000,
    source,
  }),
  "legiwatch.research.deadline.draft": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/deadlines/drafts",
    request: z
      .object({
        body: researchScope
          .extend({
            folderId: id,
            requestKey: z.string().min(8).max(180),
            deadlineId: id,
            noticeRevision: id,
            analysis: z.string().max(30000),
          })
          .strict(),
      })
      .strict(),
    response: draftReceipt,
    timeoutMs: 90000,
    source,
  }),
  "legiwatch.research.report.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/reports/preview",
    request: z.object({ body: review }).strict(),
    response: z.object({
      approvalHash: z.string(),
      rendered: z.object({ text: z.string(), html: z.string() }),
      deliveryState: z.literal("internal_review_only"),
    }),
    source,
  }),
  "legiwatch.research.report.approve": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/reports/approve",
    request: z
      .object({
        body: review
          .extend({ approvalHash: z.string().regex(/^[a-f0-9]{64}$/) })
          .strict(),
      })
      .strict(),
    response: z.object({
      runId: z.string(),
      replayed: z.boolean(),
      deliveryState: z.literal("internal_review_only").optional(),
    }),
    source,
  }),
} as const;
