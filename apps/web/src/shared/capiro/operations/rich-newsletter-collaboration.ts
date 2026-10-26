import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceId } from "./workspace-schemas";

const source =
  "capiro-backend@f102dc6c NewsletterController/NewsletterService and newsletter-account-invitation.controller.ts";
const params = z.object({ id: workspaceId }).strict();
const commentParams = params.extend({ commentId: workspaceId }).strict();
const invitationParams = z.object({ invitationId: workspaceId }).strict();
const userId = z.string().min(1).max(200);
const role = z.enum(["viewer", "commenter", "editor"]);
const userIds = z.array(userId).max(100);
// Responses stay unknown until the public Shared receivers admit captured targets.
export const richNewsletterCollaborationOperations = {
  "workspace.richNewsletter.commentCreate": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/comments",
    source,
    request: z
      .object({
        params,
        body: z
          .object({
            message: z.string().trim().min(1).max(10000),
            blockId: z.string().max(100).optional(),
            parentId: workspaceId.optional(),
            notifyUserIds: userIds.optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.commentResolve": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/newsletters/documents/:id/comments/:commentId",
    source,
    request: z
      .object({
        params: commentParams,
        body: z.object({ resolved: z.boolean() }).strict(),
      })
      .strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.team": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents/:id/reviewers",
    source,
    request: z.object({ params }).strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.reviewerGrant": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/reviewers",
    source,
    request: z
      .object({ params, body: z.object({ userId, role }).strict() })
      .strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.reviewerRemove": defineOperation({
    service: "workspace",
    method: "DELETE",
    path: "/newsletters/documents/:id/reviewers/:userId",
    source,
    request: z.object({ params: params.extend({ userId }).strict() }).strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.invitationCreate": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/newsletters/documents/:id/invitations",
    source,
    request: z
      .object({
        params,
        body: z
          .object({
            email: z.email().max(320),
            role,
            message: z.string().max(2000).optional(),
            requestKey: workspaceId,
            accountRole: z.enum(["member", "admin"]).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.invitationCancel": defineOperation({
    service: "workspace",
    method: "DELETE",
    path: "/newsletters/documents/:id/invitations/:invitationId",
    source,
    request: z
      .object({ params: params.extend({ invitationId: workspaceId }).strict() })
      .strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.reviewPreference": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/newsletters/documents/:id/review-notifications",
    source,
    request: z
      .object({
        params,
        body: z.object({ mode: z.enum(["all", "mentions", "none"]) }).strict(),
      })
      .strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.threadDefaults": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents/:id/thread-notifications",
    source,
    request: z.object({ params }).strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.threadRead": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents/:id/comments/:commentId/notifications",
    source,
    request: z.object({ params: commentParams }).strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.threadUpdate": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/newsletters/documents/:id/comments/:commentId/notifications",
    source,
    request: z
      .object({ params: commentParams, body: z.object({ userIds }).strict() })
      .strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.accountInvitationRead": defineOperation({
    service: "core",
    method: "GET",
    path: "/workspace/newsletter-account-invitations/:invitationId",
    source,
    request: z.object({ params: invitationParams }).strict(),
    response: z.unknown(),
  }),
  "workspace.richNewsletter.accountInvitationDispatch": defineOperation({
    service: "core",
    method: "POST",
    path: "/workspace/newsletter-account-invitations/:invitationId/dispatch",
    source,
    request: z
      .object({ params: invitationParams, body: z.object({}).strict() })
      .strict(),
    response: z.unknown(),
  }),
} as const;
