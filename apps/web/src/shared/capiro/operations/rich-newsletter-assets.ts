import {
  parseNewsletterAssetItem,
  parseNewsletterAssetList,
  type NewsletterReceiveResult,
} from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation, type MultipartPolicy } from "../contracts";

const source =
  "capiro-backend@194ea531838a983e76df1b96b52c22ca264ef47b packages/shared/src/newsletter-receiving.ts; apps/workspace/src/newsletters/newsletter.controller.ts; apps/workspace/src/newsletters/newsletter.service.ts";
export const assetPageSizes = [10, 25, 50, 100] as const;
export const assetSorts = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
] as const;
export const assetUploadPolicy: MultipartPolicy = {
  files: [
    {
      field: "file",
      minCount: 1,
      maxCount: 1,
      maxBytes: 10 * 1024 * 1024,
      mimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
    },
  ],
  bodyFields: {},
  maxFileBytes: 10 * 1024 * 1024,
  maxMetadataBytes: 4096,
  maxTotalBytes: 10 * 1024 * 1024 + 64 * 1024,
};
function receiving<T>(parse: (value: unknown) => NewsletterReceiveResult<T>) {
  return z.unknown().transform((value, context): T | typeof z.NEVER => {
    const result = parse(value);
    if (result.ok) return result.value;
    context.addIssue({
      code: "custom",
      message: "Invalid image library response.",
    });
    return z.NEVER;
  });
}
export const assetListQuery = z
  .object({
    page: z.number().int().min(1).max(100_000),
    pageSize: z.union([
      z.literal(10),
      z.literal(25),
      z.literal(50),
      z.literal(100),
    ]),
    search: z.string().max(200),
    sort: z.enum(assetSorts),
  })
  .strict();
export type AssetListQuery = z.infer<typeof assetListQuery>;
export const richNewsletterAssetOperations = {
  "workspace.richNewsletter.assets.list": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/assets",
    request: z.object({ query: assetListQuery }).strict(),
    response: receiving(parseNewsletterAssetList),
    source,
  }),
  "workspace.richNewsletter.assets.detail": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/assets/:id",
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
    // Payload-only transport schemas cannot bind request parameters. The feature
    // must call the public details parser with the captured requested UUID.
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.assets.upload": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/assets",
    request: z.object({ body: z.object({}).strict() }).strict(),
    encoding: "multipart",
    multipart: assetUploadPolicy,
    response: receiving(parseNewsletterAssetItem),
    source,
  }),
} as const;
