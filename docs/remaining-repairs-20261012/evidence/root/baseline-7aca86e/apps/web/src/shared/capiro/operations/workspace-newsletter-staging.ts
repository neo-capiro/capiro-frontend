import { z } from "zod";
import { defineOperation } from "../contracts";

const source =
  "capirov2@3c20f798c731403ffe2bbb6fa75dcb1bbf80bb16 docs/newsletter-staging-20261012/CONTRACT.md; versions.service.ts; outreach-command-engine.service.ts";
const id = z.uuid();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const hashFormat = z.literal("workspace-snapshot-canonical-json-v1");
const saved = {
  draftId: id,
  versionId: id,
  snapshotHash: hash,
  hashFormat,
  clientId: id.nullable(),
  savedAt: z.string().datetime(),
  authorId: z.string().min(1),
  authorKind: z.string().min(1),
};
export const savedNewsletterRevision = z
  .object({
    ...saved,
    snapshot: z.unknown(),
    contentSkeleton: z
      .object({
        subject: z.string().max(400),
        body: z.string().min(1).max(8000),
        slots: z.array(z.never()).length(0),
      })
      .strict(),
  })
  .refine(
    ({ contentSkeleton }) =>
      !/\{\{|\}\}/.test(contentSkeleton.subject + contentSkeleton.body),
  );
export const newsletterStagingBody = z
  .object({
    requestId: id,
    draftId: id,
    versionId: id,
    snapshotHash: hash,
    expectedStateVersion: z.number().int().positive(),
  })
  .strict();
export const newsletterStagingReceipt = z.object({
  status: z.enum(["applied", "no_change"]),
  batchId: id,
  stateVersion: z.number().int().positive(),
  specHash: hash,
  changed: z.boolean(),
  commandCount: z.literal(1),
  replayed: z.boolean(),
  receiptId: id,
  staged: z
    .object({
      ...saved,
      kind: z.literal("workspace_saved_newsletter_v1"),
      requestHash: hash,
      requestId: id,
      expectedStateVersion: z.number().int().positive(),
      commandHash: hash,
    })
    .strict(),
});
export const newsletterStagingOperations = {
  "workspace.newsletter.revision": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/versions/:versionId/outreach-revision",
    request: z
      .object({ params: z.object({ draftId: id, versionId: id }).strict() })
      .strict(),
    response: savedNewsletterRevision,
    source,
  }),
  "workspace.newsletter.stage": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/outreach-v3/sessions/:sessionId/newsletter-staging",
    request: z
      .object({
        params: z.object({ sessionId: id }).strict(),
        body: newsletterStagingBody,
      })
      .strict(),
    response: newsletterStagingReceipt,
    source,
  }),
} as const;
export type SavedNewsletterRevision = z.infer<typeof savedNewsletterRevision>;
export type NewsletterStagingReceipt = z.infer<typeof newsletterStagingReceipt>;
