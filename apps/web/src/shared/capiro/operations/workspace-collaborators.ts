import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceId } from "./workspace-schemas";

const source =
  "Core@1bef95ea1504ffa1bef7149a59fb0cde0a69cb38 apps/workspace/src/collaborators/{collaborators.controller.ts,collaborators.service.ts,dto/collaborator.dto.ts}; apps/api/src/workspace-collab/{workspace-collab.controller.ts,workspace-collab.dto.ts}";
export const collaboratorRole = z.enum([
  "editor",
  "reviewer",
  "commenter",
  "viewer",
]);
const identity = {
  subjectId: z.string().nullable(),
  email: z.string().nullable(),
  name: z.string().nullable(),
};
const status = z.enum(["pending", "active"]);
export const collaboratorListRow = z.discriminatedUnion("isOwner", [
  z.object({
    id: z.string().regex(/^owner:[0-9a-f-]{36}$/i),
    ...identity,
    role: z.literal("owner"),
    status: z.literal("active"),
    isOwner: z.literal(true),
  }),
  z.object({
    id: workspaceId,
    ...identity,
    role: collaboratorRole,
    status,
    isOwner: z.literal(false),
  }),
]);
export const savedCollaborator = z.object({
  id: workspaceId,
  tenantId: workspaceId,
  draftId: workspaceId,
  ...identity,
  role: collaboratorRole,
  status,
  invitedById: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const draftParams = z.object({ draftId: workspaceId }).strict();
const rowParams = draftParams.extend({ id: workspaceId }).strict();
const invitationParams = draftParams
  .extend({ invitationId: workspaceId })
  .strict();
export const collaboratorEmailReceipt = z
  .object({
    draftId: workspaceId,
    invitationId: workspaceId,
    status: z.enum([
      "not_requested",
      "claimed",
      "sending",
      "accepted",
      "disabled",
      "failed",
      "cancelled",
      "outcome_unknown",
    ]),
    providerMessageId: z.string().nullable(),
    errorCode: z.string().nullable(),
    updatedAt: z.string().nullable(),
  })
  .refine((receipt) =>
    receipt.status === "accepted"
      ? Boolean(receipt.providerMessageId?.trim())
      : receipt.providerMessageId === null,
  );

export const workspaceCollaboratorOperations = {
  "workspace.collaborators": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/drafts/:draftId/collaborators",
    request: z.object({ params: draftParams }).strict(),
    response: z.object({ collaborators: z.array(collaboratorListRow) }),
    source,
  }),
  "workspace.collaborator.invite": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/collaborators",
    request: z
      .object({
        params: draftParams,
        body: z
          .object({
            subjectId: z.string().trim().min(1),
            role: collaboratorRole,
            name: z.string().optional(),
            inviterName: z.string().optional(),
          })
          .strict(),
      })
      .strict(),
    response: savedCollaborator,
    source,
  }),
  "workspace.collaborator.accept": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/collaborators/:id/accept",
    request: z.object({ params: rowParams }).strict(),
    response: savedCollaborator,
    source,
  }),
  "workspace.collaborator.decline": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/drafts/:draftId/collaborators/:id/decline",
    request: z.object({ params: rowParams }).strict(),
    response: z.object({ declined: z.literal(true) }),
    source,
  }),
  "workspace.collaborator.role": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/drafts/:draftId/collaborators/:id",
    request: z
      .object({
        params: rowParams,
        body: z.object({ role: collaboratorRole }).strict(),
      })
      .strict(),
    response: savedCollaborator,
    source,
  }),
  "workspace.collaborator.remove": defineOperation({
    service: "workspace",
    method: "DELETE",
    path: "/drafts/:draftId/collaborators/:id",
    request: z.object({ params: rowParams }).strict(),
    response: z.object({ deleted: z.literal(true) }),
    source,
  }),
  "workspace.collaborator.email.request": defineOperation({
    service: "core",
    method: "POST",
    path: "/workspace/collaborator-invite-email",
    request: z.object({ body: invitationParams }).strict(),
    response: collaboratorEmailReceipt,
    source,
  }),
  "workspace.collaborator.email.status": defineOperation({
    service: "core",
    method: "GET",
    path: "/workspace/drafts/:draftId/collaborator-invite-email/:invitationId",
    request: z.object({ params: invitationParams }).strict(),
    response: collaboratorEmailReceipt,
    source,
  }),
  "workspace.collaborator.email.cancel": defineOperation({
    service: "core",
    method: "POST",
    path: "/workspace/drafts/:draftId/collaborator-invite-email/:invitationId/cancel",
    request: z.object({ params: invitationParams }).strict(),
    response: collaboratorEmailReceipt,
    source,
  }),
} as const;
export type CollaboratorListRow = z.infer<typeof collaboratorListRow>;
export type CollaboratorRole = z.infer<typeof collaboratorRole>;
export type CollaboratorEmailReceipt = z.infer<typeof collaboratorEmailReceipt>;
