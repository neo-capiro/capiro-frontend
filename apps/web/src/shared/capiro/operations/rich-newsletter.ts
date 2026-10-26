import {
  parseNewsletterCampaign,
  parseNewsletterDocumentList,
  parseNewsletterOutreachRecord,
  parseNewsletterOutreachStage,
  parseNewsletterPreview,
  parseNewsletterStageReceipt,
  type NewsletterCampaignConfig,
  type NewsletterDesign,
  type NewsletterReceiveResult,
} from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation } from "../contracts";
import { richNewsletterId } from "./newsletter-routing";

const source =
  "capiro-backend@d68024dc62edddb0784f79b4e5ca50335dd1ca89 packages/shared/src/newsletter-receiving.ts; apps/workspace/src/newsletters/newsletter.controller.ts; docs/contracts/newsletter-outreach-response-routing.md";

/** The public package owns receiving shapes; this only adapts the gateway slot. */
function receiving<T>(parse: (value: unknown) => NewsletterReceiveResult<T>) {
  return z.unknown().transform((value, context): T | typeof z.NEVER => {
    const result = parse(value);
    if (result.ok) return result.value;
    context.addIssue({
      code: "custom",
      message: "Invalid newsletter response.",
    });
    return z.NEVER;
  });
}

// Zod also admits nil/max sentinels; the Workspace identity profile is v1–v8.
const workspaceId = z
  .uuid()
  .refine((value) => "12345678".includes(value.charAt(14)));
const documentParams = z.object({ id: workspaceId }).strict();
const stageParams = z.object({ id: richNewsletterId }).strict();
const objectBody = (value: unknown) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Request DTOs require objects; backend normalization owns their rich contents.
// Public types provide compile-time input contracts without a second wire parser.
export const richNewsletterSaveBody = z
  .object({
    revision: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER - 1),
    name: z.string().max(200),
    design: z.custom<NewsletterDesign>(objectBody),
    config: z.custom<NewsletterCampaignConfig>(objectBody),
  })
  .strict();

export const richNewsletterOperations = {
  "workspace.richNewsletter.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents",
    request: z.object({}).strict(),
    response: receiving(parseNewsletterDocumentList),
    source,
  }),
  "workspace.richNewsletter.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents",
    request: z
      .object({
        body: z
          .object({
            name: z.string().max(200).optional(),
            templateId: z.string().max(100).optional(),
          })
          .strict(),
      })
      .strict(),
    response: receiving(parseNewsletterCampaign),
    source,
  }),
  "workspace.richNewsletter.detail": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents/:id",
    request: z.object({ params: documentParams }).strict(),
    response: receiving(parseNewsletterCampaign),
    source,
  }),
  "workspace.richNewsletter.save": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/newsletters/documents/:id",
    request: z
      .object({ params: documentParams, body: richNewsletterSaveBody })
      .strict(),
    response: receiving(parseNewsletterCampaign),
    source,
  }),
  "workspace.richNewsletter.preview": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/preview",
    request: z
      .object({
        params: documentParams,
        body: z.object({ liveMergeTags: z.boolean().optional() }).strict(),
      })
      .strict(),
    response: receiving(parseNewsletterPreview),
    source,
  }),
  "workspace.richNewsletter.stage": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/stage",
    request: z
      .object({
        params: documentParams,
        body: z.object({ revision: z.number().int().positive() }).strict(),
      })
      .strict(),
    response: receiving(parseNewsletterStageReceipt),
    source,
  }),
  "workspace.richNewsletter.stagedRevision": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents/:id/stages/:revision",
    request: z
      .object({
        params: documentParams.extend({
          revision: z.number().int().positive(),
        }),
      })
      .strict(),
    response: receiving(parseNewsletterStageReceipt).nullable(),
    source,
  }),
  "engagement.richNewsletter.stage": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/newsletters/stages/:id",
    request: z.object({ params: stageParams }).strict(),
    response: receiving(parseNewsletterOutreachStage),
    source,
  }),
  "engagement.richNewsletter.record": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/newsletters/:id",
    request: z.object({ params: stageParams }).strict(),
    response: receiving(parseNewsletterOutreachRecord),
    source,
  }),
  "engagement.richNewsletter.open": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/newsletters/stages/:id/open",
    request: z.object({ params: stageParams }).strict(),
    response: receiving(parseNewsletterOutreachRecord),
    source,
  }),
} as const;
