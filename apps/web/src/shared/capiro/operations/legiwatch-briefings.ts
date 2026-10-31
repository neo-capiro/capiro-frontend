import { z } from "zod";
import { defineOperation } from "../contracts";
import { evidenceId, evidenceScope } from "./legiwatch-evidence-schemas";

export const briefingRef = z
  .object({
    kind: z.literal("research"),
    id: evidenceId,
    revision: z.string().min(1).max(200),
    locator: z.string().min(1).max(2000),
  })
  .strict();
export const briefingCitation = briefingRef
  .extend({
    quote: z.string().min(1).max(5000),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .strict()
  .refine(
    (value) =>
      value.end > value.start && value.quote.length === value.end - value.start,
    { message: "Select an exact source passage." },
  );
export const briefingDraftBody = evidenceScope
  .extend({
    requestKey: z.string().min(8).max(180),
    template: z.enum(["research_update", "daily_legislative_brief"]),
    cutoff: z.iso.datetime(),
    timezone: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }),
    title: z.string().min(1).max(200),
    analysis: z.string().max(30000),
    sources: z.array(briefingRef).min(1).max(50),
    citations: z.array(briefingCitation).min(1).max(150),
    generationMode: z.enum(["source_list", "authored_analysis"]),
    coverageGaps: z.array(z.string().max(500)).max(50).optional(),
  })
  .strict();
const reviewBody = z
  .object({
    selectionId: evidenceId,
    audience: z.enum(["internal", "external"]),
    acceptSourceGaps: z.boolean(),
  })
  .strict();
const preview = z.object({
  audience: z.string(),
  rendered: z.object({ html: z.string(), text: z.string() }),
  approvalHash: z.string(),
  deliveryState: z.string(),
});
export const draftReceipt = z.object({
  selectionId: z.string(),
  state: z.literal("saved").optional(),
  draftState: z.literal("workspace_not_configured").optional(),
  draft: z
    .object({
      draftId: z.string(),
      contextItemId: z.string(),
      state: z.literal("complete"),
      replayed: z.boolean(),
    })
    .optional(),
});
const source =
  "apps/intel-api/src/tracker/editorial/editorial.controller.ts + editorial.service.ts; apps/workspace/src/drafts/editorial-source.controller.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const legiwatchBriefingOperations = {
  "legiwatch.briefing.save": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/briefings/drafts",
    request: z.object({ body: briefingDraftBody }).strict(),
    response: draftReceipt,
    timeoutMs: 90000,
    source,
  }),
  "legiwatch.briefing.preview": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/briefings/preview",
    request: z.object({ body: reviewBody }).strict(),
    response: preview,
    source,
  }),
  "legiwatch.briefing.approve": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/evidence/briefings/approve",
    request: z
      .object({
        body: reviewBody.extend({ approvalHash: z.string().min(1) }).strict(),
      })
      .strict(),
    response: z.object({
      runId: z.string(),
      replayed: z.boolean(),
      deliveryState: z.string().optional(),
    }),
    source,
  }),
  "legiwatch.briefing.history": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/evidence/briefings/drafts",
    request: z
      .object({
        query: evidenceScope
          .extend({
            cursor: z.string().max(1000).optional(),
            limit: z.number().int().min(1).max(50).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      items: z.array(
        z.object({
          id: z.string(),
          selectionId: z.string(),
          title: z.string().nullable().optional(),
          template: z.string().nullable().optional(),
          cutoff: z.string().nullable().optional(),
          state: z.string(),
          createdAt: z.string(),
          draft: z
            .object({
              draftId: z.string(),
              title: z.string(),
              updatedAt: z.string(),
            })
            .nullable(),
        }),
      ),
      nextCursor: z.string().nullable(),
      draftLookupState: z.string(),
    }),
    source,
  }),
} as const;
