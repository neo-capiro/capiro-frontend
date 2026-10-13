import { z } from "zod";
import { defineOperation } from "../contracts";
import { emptyWorkspaceRequest, workspaceId } from "./workspace-schemas";

const source =
  "capirov2@4be13b0 apps/workspace/src/drafts/{drafts.service,dto/draft.dto}.ts; documents/{documents.service,dto/document.dto}.ts; versions/versions.service.ts; delivery/share-link.service.ts";
const params = z.object({ id: workspaceId }).strict();
const draftParams = z.object({ draftId: workspaceId }).strict();
export const newsletterBlock = z
  .object({
    id: z.string().min(1).max(64),
    kind: z.enum([
      "heading",
      "paragraph",
      "button",
      "divider",
      "spacer",
      "image",
      "social",
      "logo",
      "code",
    ]),
    text: z.string().max(20000),
    href: z.string().max(2048).optional(),
  })
  .strict();
export const newsletterBody = z
  .object({
    subject: z.string().max(400),
    preview: z.string().max(500),
    firmName: z.string().max(200),
    mailingAddress: z.string().max(500),
    blocks: z.array(newsletterBlock).max(100),
  })
  .strict();
const sectionBlock = z
  .object({
    id: z.string(),
    type: z.literal("section"),
    title: z.string().optional(),
    content: z.string().optional(),
  })
  .strict();
const persistedDocumentBody = z.object({
  blocks: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["section", "photo", "table", "logo"]),
        title: z.string().optional(),
        content: z.string().optional(),
      }),
    )
    .optional(),
  newsletter: newsletterBody.optional(),
});
export const draftDocument = z.object({
  id: workspaceId,
  draftId: workspaceId,
  name: z.string(),
  ordinal: z.number(),
  body: persistedDocumentBody,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const workspaceDraft = z.object({
  id: workspaceId,
  prospectId: workspaceId.nullable().optional(),
  tenantId: workspaceId.optional(),
  ownerId: z.string(),
  docTitle: z.string(),
  client: z.string().nullable(),
  product: z.string().nullable(),
  industry: z.string().nullable(),
  status: z.enum(["draft", "complete"]),
  updatedAt: z.string(),
  createdAt: z.string(),
  documents: z.array(draftDocument),
  config: z.object({
    sections: z.array(z.string()).optional(),
    sectionContent: z.record(z.string(), z.string()).optional(),
    tone: z.string().optional(),
  }),
});
const version = z.object({
  id: workspaceId,
  draftId: workspaceId,
  label: z.string().nullable(),
  authorId: z.string(),
  authorKind: z.string(),
  createdAt: z.string(),
});
export const workspaceDocumentOperations = {
  "workspace.draft": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:id",
    request: z.object({ params }).strict(),
    response: workspaceDraft,
    source,
  }),
  "workspace.draft.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts",
    request: z
      .object({
        body: z
          .object({
            industry: z.string().max(200).optional(),
            product: z.string().max(200).optional(),
            client: z.string().max(200).optional(),
            docTitle: z.string().min(1).max(500).optional(),
          })
          .strict(),
      })
      .strict(),
    response: workspaceDraft,
    source,
  }),
  "workspace.draft.update": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/drafts/:id",
    request: z
      .object({
        params,
        body: z
          .object({
            docTitle: z.string().min(1).max(500).optional(),
            status: z.enum(["draft", "complete"]).optional(),
            config: z
              .object({
                sections: z.array(z.string().max(200)).max(100).optional(),
                sectionContent: z
                  .record(z.string().max(200), z.string().max(50000))
                  .optional(),
                tone: z.string().max(100).optional(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      })
      .strict(),
    response: workspaceDraft,
    source,
  }),
  "workspace.document.update": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/drafts/:draftId/documents/:docId",
    request: z
      .object({
        params: draftParams.extend({ docId: workspaceId }).strict(),
        body: z
          .object({
            name: z.string().max(300).optional(),
            body: z
              .object({
                blocks: z.array(sectionBlock).max(100),
                newsletter: newsletterBody.optional(),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    response: draftDocument,
    source,
  }),
  "workspace.draft.versions": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/versions",
    request: z.object({ params: draftParams }).strict(),
    response: z.array(version),
    source,
  }),
  "workspace.draft.snapshot": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/versions",
    request: z
      .object({
        params: draftParams,
        body: z.object({ label: z.string().max(300).optional() }).strict(),
      })
      .strict(),
    response: version,
    source,
  }),
  "workspace.shares": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/shares",
    request: emptyWorkspaceRequest,
    response: z.object({
      shares: z.array(
        z.object({
          id: workspaceId,
          draftId: workspaceId,
          draftTitle: z.string(),
          label: z.string().nullable(),
          createdAt: z.string(),
          expiresAt: z.string().nullable(),
          guestCommentCount: z.number().int(),
        }),
      ),
    }),
    source,
  }),
  "workspace.share.revoke": defineOperation({
    service: "workspace",
    method: "DELETE",
    path: "/drafts/:draftId/delivery/share-links/:shareLinkId",
    request: z
      .object({
        params: draftParams.extend({ shareLinkId: workspaceId }).strict(),
      })
      .strict(),
    response: z.null(),
    source,
  }),
  "workspace.context.add": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/context",
    request: z
      .object({
        params: draftParams,
        body: z
          .object({
            kind: z.literal("free-text"),
            payload: z
              .object({
                text: z.string().min(1).max(200000),
                sourceType: z.literal("internal"),
                source: z.string().min(1).max(200),
                hearingId: z.string().max(200).optional(),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      id: workspaceId,
      draftId: workspaceId,
      kind: z.literal("free-text"),
      createdAt: z.string(),
    }),
    source:
      "capirov2@4be13b0 apps/workspace/src/context/context.controller.ts, context.service.ts and dto/context.dto.ts",
  }),
};
export type NewsletterBody = z.infer<typeof newsletterBody>;
export type NewsletterBlock = z.infer<typeof newsletterBlock>;
export type WorkspaceDraftDocument = z.infer<typeof workspaceDraft>;
