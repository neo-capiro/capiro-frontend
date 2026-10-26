import {
  parseNewsletterLibraryItem,
  parseNewsletterLibraryList,
  parseNewsletterTemplateItem,
  parseNewsletterTemplateList,
  type NewsletterReceiveResult,
} from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation } from "../contracts";

const source =
  "capiro-backend@1811e663e896a1f4fe131780263a3cfaab1e84c8; newsletter.controller.ts LibraryDto/UpdateLibraryDto/library/saveLibrary/updateLibrary/removeLibrary; public newsletter section and template receivers";
function receiving<T>(parse: (value: unknown) => NewsletterReceiveResult<T>) {
  return z.unknown().transform((value, context) => {
    const result = parse(value);
    if (result.ok) return result.value;
    context.addIssue({
      code: "custom",
      message: "Invalid saved library response",
    });
    return z.NEVER;
  });
}

export const richNewsletterLibraryOperations = {
  "workspace.richNewsletter.sections.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/library/section",
    request: z.object({}).strict(),
    response: receiving(parseNewsletterLibraryList),
    source,
  }),
  "workspace.richNewsletter.sections.save": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/library",
    request: z
      .object({
        params: z
          .object({
            id: z
              .uuid()
              .refine((value) => "12345678".includes(value.charAt(14))),
          })
          .strict(),
        body: z
          .object({
            name: z.string().trim().min(1).max(200),
            folder: z.string().trim().max(100).optional(),
            sectionId: z.string().min(1).max(100),
          })
          .strict(),
      })
      .strict(),
    response: receiving(parseNewsletterLibraryItem),
    source,
  }),
  "workspace.richNewsletter.templates.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/library/template",
    request: z.object({}).strict(),
    response: receiving(parseNewsletterTemplateList),
    source,
  }),
  "workspace.richNewsletter.templates.save": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/library",
    request: z
      .object({
        params: z
          .object({
            id: z
              .uuid()
              .refine((value) => "12345678".includes(value.charAt(14))),
          })
          .strict(),
        body: z
          .object({
            name: z.string().trim().min(1).max(200),
            folder: z.string().trim().max(100).optional(),
          })
          .strict(),
      })
      .strict(),
    response: receiving(parseNewsletterTemplateItem),
    source,
  }),
  "workspace.richNewsletter.library.update": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/newsletters/library/items/:id",
    request: z
      .object({
        params: z
          .object({
            id: z
              .uuid()
              .refine((value) => "12345678".includes(value.charAt(14))),
          })
          .strict(),
        body: z
          .object({
            name: z.string().trim().min(1).max(200),
            folder: z.string().trim().max(100),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ ok: z.literal(true) }).strict(),
    source,
  }),
  "workspace.richNewsletter.library.remove": defineOperation({
    service: "workspace",
    method: "DELETE",
    path: "/newsletters/library/items/:id",
    request: z
      .object({
        params: z
          .object({
            id: z
              .uuid()
              .refine((value) => "12345678".includes(value.charAt(14))),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ ok: z.literal(true) }).strict(),
    source,
  }),
} as const;
