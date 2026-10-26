import {
  parseNewsletterCapabilities,
  parseNewsletterWritingProposal,
  parseNewsletterAltText,
  parseNewsletterLinkProposal,
} from "@capiro/shared/newsletter";
import { z } from "zod";
import { defineOperation, type MultipartPolicy } from "../contracts";
import { receiving } from "./rich-newsletter";
import { assetUuid, assetUploadPolicy } from "./rich-newsletter-assets";

const source =
  "capiro-backend@7e7a7ad6 packages/shared/src/newsletter-tool-receiving.ts; apps/workspace/src/newsletters/newsletter.controller.ts; apps/workspace/src/newsletters/newsletter.service.ts";
const params = z.object({ id: assetUuid }).strict();
const url = z.object({ url: z.string().min(1).max(2048) }).strict();
const sourceToken = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .optional();
export const imageToolPolicy: MultipartPolicy = {
  ...assetUploadPolicy,
  files: [
    {
      ...assetUploadPolicy.files[0]!,
      minCount: 0,
      mimeTypes: ["image/png", "image/jpeg", "image/webp"],
    },
  ],
  bodyFields: { sourceToken: "string", prompt: "string", count: "string" },
  maxMetadataBytes: 24 * 1024,
};
export const richNewsletterProviderOperations = {
  "workspace.richNewsletter.capabilities": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/capabilities",
    request: z.object({}).strict(),
    response: receiving(parseNewsletterCapabilities),
    source,
  }),
  "workspace.richNewsletter.write": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/write",
    timeoutMs: 70_000,
    request: z
      .object({
        params,
        body: z
          .object({
            prompt: z.string().min(1).max(4000),
            text: z.string().max(30_000),
            kind: z.string().max(100),
          })
          .strict(),
      })
      .strict(),
    response: receiving(parseNewsletterWritingProposal),
    source,
  }),
  "workspace.richNewsletter.altText": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/generate-alt-text",
    timeoutMs: 70_000,
    request: z
      .object({ params, body: z.object({ sourceToken }).strict() })
      .strict(),
    encoding: "multipart",
    multipart: imageToolPolicy,
    response: receiving(parseNewsletterAltText),
    source,
  }),
  "workspace.richNewsletter.refineImage": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/refine-image",
    timeoutMs: 240_000,
    request: z
      .object({
        params,
        body: z
          .object({
            sourceToken,
            prompt: z.string().min(1).max(4000),
            count: z.union([z.literal(1), z.literal(4)]),
          })
          .strict(),
      })
      .strict(),
    encoding: "multipart",
    multipart: imageToolPolicy,
    // The feature supplies the captured requested count.
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.htmlCheck": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/html-check",
    timeoutMs: 90_000,
    request: z
      .object({
        params,
        body: z
          .object({
            revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
          })
          .strict(),
      })
      .strict(),
    // The existing public HTML-check receiver binds the captured saved revision.
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.videoThumbnail": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/video-thumbnail",
    timeoutMs: 90_000,
    request: z.object({ params, body: url }).strict(),
    // The feature supplies canonical source/provider from newsletterVideoSource.
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.linkPreview": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/link-preview",
    timeoutMs: 90_000,
    request: z.object({ params, body: url }).strict(),
    response: receiving(parseNewsletterLinkProposal),
    source,
  }),
} as const;
