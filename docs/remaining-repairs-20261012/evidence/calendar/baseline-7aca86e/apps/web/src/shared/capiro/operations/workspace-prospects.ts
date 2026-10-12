import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceDraft } from "./workspace-documents";
import { workspaceId } from "./workspace-schemas";

const source =
  "capirov2@9c2765224fc38d111df0fe184ca50229c6128373 apps/workspace/src/drafts/{drafts.controller,drafts.service,dto/draft.dto}.ts and prospect-resources/prospect-draft-create.ts (PR2400 source-only)";
export const prospectWorkspaceDraft = workspaceDraft
  .extend({ prospectId: workspaceId, tenantId: workspaceId })
  .refine(
    (draft) =>
      draft.documents.length > 0 &&
      draft.documents.every((document) => document.draftId === draft.id) &&
      new Set(draft.documents.map((document) => document.id)).size ===
        draft.documents.length,
  );
const prospectDraftSummary = workspaceDraft
  .pick({
    id: true,
    ownerId: true,
    docTitle: true,
    client: true,
    product: true,
    industry: true,
    status: true,
    updatedAt: true,
    createdAt: true,
  })
  .extend({
    tenantId: workspaceId,
    prospectId: workspaceId,
    versions: z
      .array(z.object({ id: workspaceId, createdAt: z.string() }))
      .max(1),
  });
export const prospectDraftCreateBody = z
  .object({
    prospectId: workspaceId,
    requestId: workspaceId,
    docTitle: z.string().trim().min(1).max(500),
  })
  .strict();
export const workspaceProspectOperations = {
  "workspace.prospect.drafts": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts",
    request: z
      .object({ query: z.object({ prospectId: workspaceId }).strict() })
      .strict(),
    response: z.object({
      drafts: z
        .array(prospectDraftSummary)
        .refine(
          (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
        ),
    }),
    source,
  }),
  "workspace.prospect.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts",
    request: z.object({ body: prospectDraftCreateBody }).strict(),
    response: prospectWorkspaceDraft,
    source,
  }),
};
export type ProspectDraftCreate = z.infer<typeof prospectDraftCreateBody>;
