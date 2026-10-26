import { z } from "zod";
import { defineOperation } from "../contracts";
import { emptyWorkspaceRequest, workspaceId } from "./workspace-schemas";
import { briefCopyBodySchema } from "./workspace-brief-copy-body";
import { briefCopySourceSchema } from "./workspace-brief-copy-schemas";

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
const persistedDocumentBody = z
  .object({
    blocks: z
      .array(
        z
          .object({
            id: z.string(),
            type: z.enum(["section", "photo", "table", "logo"]),
            title: z.string().optional(),
            content: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
    newsletter: newsletterBody.optional(),
  })
  .passthrough();
const documentIdentity = z.object({
  id: workspaceId,
  draftId: workspaceId,
  name: z.string(),
  ordinal: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
// A malformed association never falls through to the ordinary document path.
// Bound bodies may use any rich JSON fields, including ordinary reserved names.
export const draftDocument = z.union([
  documentIdentity.extend({
    sourceBriefVersion: briefCopySourceSchema,
    body: briefCopyBodySchema,
  }),
  documentIdentity.extend({
    sourceBriefVersion: z.null().optional(),
    body: persistedDocumentBody,
  }),
]);
export const workspaceDraft = z.object({
  id: workspaceId,
  prospectId: workspaceId.nullable().optional(),
  tenantId: workspaceId.optional(),
  ownerId: z.string(),
  docTitle: z.string(),
  client: z.string().nullable(),
  clientId: workspaceId.nullable().optional(),
  clientAssociation: z.literal("held").optional(),
  product: z.string().nullable(),
  industry: z.string().nullable(),
  status: z.enum(["draft", "complete"]),
  updatedAt: z.string(),
  createdAt: z.string(),
  documents: z.array(draftDocument),
  config: z.object({
    clientId: workspaceId.nullable().optional(),
    sections: z.array(z.string()).optional(),
    sectionContent: z.record(z.string(), z.string()).optional(),
    tone: z.string().optional(),
  }),
});
// A saved version carries the exact bounded draft state captured at save time
// (apps/workspace VersionsService.list returns the raw WsDocVersion row incl.
// `snapshot`). Unknown rich fields are preserved by passthrough so read-only
// history never lossily reshapes or drops stored JSON.
const savedVersionDocument = z
  .object({
    id: workspaceId,
    name: z.string().optional(),
    ordinal: z.number().optional(),
    body: z.unknown().optional(),
    sourceBriefVersion: z.unknown().optional(),
  })
  .passthrough();
const savedVersionSnapshot = z
  .object({
    docTitle: z.string().optional(),
    // config.clientId is the snapshot's client association (the restore parent
    // identity check); other engine config keys are preserved.
    config: z
      .object({
        clientId: workspaceId.nullable().optional(),
        sections: z.array(z.string()).optional(),
        sectionContent: z.record(z.string(), z.string()).optional(),
      })
      .passthrough()
      .optional(),
    ask: z.unknown().optional(),
    documents: z.array(savedVersionDocument).optional(),
  })
  .passthrough();
const version = z.object({
  id: workspaceId,
  draftId: workspaceId,
  label: z.string().nullable(),
  authorId: z.string(),
  authorKind: z.string(),
  createdAt: z.string(),
  // Present on the real producer rows (VersionsService.list/create). Optional
  // here so the shared version response stays additive for existing consumers.
  snapshot: savedVersionSnapshot.optional(),
});
const ordinarySaveSource =
  "capirov2@45eaba1b720849e914052fcf3d7003ac73ac27cd apps/workspace/src/drafts/{ordinary-draft-save.ts,dto/save-draft.dto.ts,drafts.controller.ts,drafts.service.ts}";
const ordinaryHash = z.string().regex(/^[a-f0-9]{64}$/);
// The editor sends only supported title/section edits. Core merges config;
// unprojected config, body, documents and associations are never round-tripped.
export const manualSaveBody = z
  .object({
    requestId: workspaceId,
    expectedStateHash: ordinaryHash,
    expectedClientId: workspaceId.nullable(),
    label: z.literal("Manual save"),
    draft: z
      .object({
        docTitle: z.string().min(1).max(500),
        config: z
          .object({
            sectionContent: z.record(
              z.string().max(200),
              z.string().max(50000),
            ),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      new TextEncoder().encode(JSON.stringify(value)).byteLength <= 1_000_000,
    "The save exceeds the supported byte limit.",
  );
export const newsletterSaveBody = z
  .object({
    requestId: workspaceId,
    expectedStateHash: ordinaryHash,
    expectedClientId: workspaceId.nullable(),
    label: z.literal("Newsletter revision"),
    draft: z.object({ docTitle: z.string().min(1).max(500) }).strict(),
    documents: z
      .array(
        z
          .object({
            id: workspaceId,
            name: z.string().min(1).max(400),
            body: persistedDocumentBody.extend({ newsletter: newsletterBody }),
          })
          .strict(),
      )
      .length(1),
  })
  .strict()
  .refine(
    (value) =>
      new TextEncoder().encode(JSON.stringify(value)).byteLength <= 1_000_000,
    "The save exceeds the supported byte limit.",
  );
export const ordinarySaveBody = z.union([manualSaveBody, newsletterSaveBody]);
export const ordinaryDraftState = z
  .object({
    schemaVersion: z.literal(1),
    tenantId: workspaceId,
    draftId: workspaceId,
    clientId: workspaceId.nullable(),
    stateHash: ordinaryHash,
    hashFormat: z.literal("workspace-ordinary-draft-state-v1"),
    draft: workspaceDraft.extend({
      tenantId: workspaceId,
      clientId: workspaceId.nullable(),
      prospectId: z.null().optional(),
    }),
  })
  .strict();
export const ordinarySaveResponse = z
  .object({
    schemaVersion: z.literal(1),
    replayed: z.boolean(),
    receipt: z
      .object({
        operation: z.literal("save_ordinary_draft"),
        tenantId: workspaceId,
        draftId: workspaceId,
        actorId: z.string().min(1).max(200),
        requestId: workspaceId,
        requestHash: ordinaryHash,
        clientId: workspaceId.nullable(),
        stateHash: ordinaryHash,
        versionId: workspaceId,
        savedAt: z.iso.datetime(),
        snapshotHash: ordinaryHash,
        hashFormat: z.literal("workspace-snapshot-canonical-json-v1"),
      })
      .strict(),
  })
  .strict();
export type OrdinarySaveBody = z.infer<typeof ordinarySaveBody>;
export type OrdinaryDraftState = z.infer<typeof ordinaryDraftState>;
export type OrdinarySaveResponse = z.infer<typeof ordinarySaveResponse>;

export const workspaceDocumentOperations = {
  "workspace.draft.state": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:id/state",
    request: z.object({ params }).strict(),
    response: ordinaryDraftState,
    source: ordinarySaveSource,
  }),
  "workspace.draft.save": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:id/save",
    request: z.object({ params, body: ordinarySaveBody }).strict(),
    response: ordinarySaveResponse,
    source: ordinarySaveSource,
  }),
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
            clientId: workspaceId.nullable().optional(),
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
            clientId: workspaceId.nullable().optional(),
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
export type SavedVersion = z.infer<typeof version>;
export type SavedVersionSnapshot = z.infer<typeof savedVersionSnapshot>;
export type SavedVersionDocument = z.infer<typeof savedVersionDocument>;
