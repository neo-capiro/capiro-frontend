import {
  parseNewsletterLibraryItem,
  parseNewsletterLibraryList,
  type NewsletterReceiveResult,
} from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation } from "../contracts";

const source =
  "capiro-backend@2381b4d75df8ade07e26fbbfee46af1d791815da; newsletter.controller.ts LibraryDto/library/saveLibrary; public newsletter section receivers";
function receiving<T>(parse: (value: unknown) => NewsletterReceiveResult<T>) {
  return z.unknown().transform((value, context) => {
    const result = parse(value);
    if (result.ok) return result.value;
    context.addIssue({
      code: "custom",
      message: "Invalid saved section response",
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
} as const;
