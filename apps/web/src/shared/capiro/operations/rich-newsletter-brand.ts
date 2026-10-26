import {
  parseNewsletterBrandKit,
  parseNewsletterFont,
  type NewsletterReceiveResult,
} from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation, type MultipartPolicy } from "../contracts";
const source =
  "capiro-backend Core1625a98bfe3; NewsletterController.brandKit/saveBrandKit/uploadFont; NewsletterService1550–1641; public brand/font receiving";
function received<T>(parse: (value: unknown) => NewsletterReceiveResult<T>) {
  return z.unknown().transform((value, context) => {
    const result = parse(value);
    if (result.ok) return result.value;
    context.addIssue({
      code: "custom",
      message: "Invalid newsletter brand response.",
    });
    return z.NEVER;
  });
}
export const newsletterFontUploadPolicy: MultipartPolicy = {
  files: [
    { field: "file", minCount: 1, maxCount: 1, maxBytes: 2 * 1024 * 1024 },
  ],
  bodyFields: {},
  maxFileBytes: 2 * 1024 * 1024,
  maxMetadataBytes: 4096,
  maxTotalBytes: 2 * 1024 * 1024 + 64 * 1024,
};
export const richNewsletterBrandOperations = {
  "workspace.richNewsletter.brand.read": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/brand-kit",
    request: z.object({}).strict(),
    response: received(parseNewsletterBrandKit),
    source,
  }),
  "workspace.richNewsletter.brand.save": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/newsletters/brand-kit",
    request: z.object({ body: received(parseNewsletterBrandKit) }).strict(),
    // The caller binds the actual returned revision using the public parser.
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.brand.font": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/brand-kit/fonts",
    request: z.object({ body: z.object({}).strict() }).strict(),
    encoding: "multipart",
    multipart: newsletterFontUploadPolicy,
    response: received(parseNewsletterFont),
    source,
  }),
} as const;
