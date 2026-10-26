import { parseNewsletterSurveyDraftList } from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "capiro-backend Core1630eab6ac4; NewsletterController.SurveyDraftDto/surveys/saveSurvey; NewsletterService447–537; public draft receiving";
const params = z
  .object({
    id: z.uuid().refine((value) => "12345678".includes(value.charAt(14))),
  })
  .strict();
export const richNewsletterSurveyOperations = {
  "workspace.richNewsletter.surveys.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents/:id/surveys",
    request: z.object({ params }).strict(),
    response: z.unknown().transform((value, context) => {
      const result = parseNewsletterSurveyDraftList(value);
      if (result.ok) return result.value;
      context.addIssue({
        code: "custom",
        message: "Invalid survey draft library.",
      });
      return z.NEVER;
    }),
    source,
  }),
  "workspace.richNewsletter.surveys.save": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/surveys",
    request: z
      .object({
        params,
        body: z
          .object({
            name: z.string().trim().min(1).max(200),
            definition: z.unknown(),
            id: z.uuid().optional(),
            revision: z.number().int().min(1).max(1_000_000).optional(),
          })
          .strict()
          .refine((body) =>
            body.id ? body.revision !== undefined : body.revision === undefined,
          ),
      })
      .strict(),
    // A separate row read may already be newer. The caller binds echoed id/revision;
    // rejection is unconfirmed, never evidence of a rolled-back write.
    response: z.unknown(),
    source,
  }),
} as const;
