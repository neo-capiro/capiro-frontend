import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceId } from "./workspace-schemas";
import { collaboratorRole } from "./workspace-collaborators";

const source =
  "Core@1bef95ea1504ffa1bef7149a59fb0cde0a69cb38 apps/workspace/src/notifications/{notifications.controller.ts,notifications.service.ts}; apps/workspace/prisma/schema.prisma WsNotification";
export const workspaceNotification = z.object({
  id: workspaceId,
  tenantId: workspaceId,
  recipientId: z.string(),
  kind: z.enum([
    "collab_invite",
    "collab_accepted",
    "collab_declined",
    "newsletter_review",
    "newsletter_comment",
  ]),
  draftId: workspaceId.nullable(),
  collaboratorId: workspaceId.nullable(),
  newsletterId: workspaceId.nullable(),
  actorName: z.string().nullable(),
  draftTitle: z.string().nullable(),
  role: collaboratorRole.nullable(),
  message: z.string(),
  read: z.boolean(),
  actionable: z.boolean(),
  createdAt: z.string(),
});
export const workspaceNotificationOperations = {
  "workspace.notifications": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/notifications",
    request: z.object({}).strict(),
    response: z.object({
      items: z.array(workspaceNotification),
      unread: z.number().int().nonnegative(),
    }),
    source,
  }),
  "workspace.notification.read": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/notifications/:id/read",
    request: z
      .object({ params: z.object({ id: workspaceId }).strict() })
      .strict(),
    response: workspaceNotification,
    source,
  }),
  "workspace.notifications.readAll": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/notifications/read-all",
    request: z.object({}).strict(),
    response: z.object({ updated: z.number().int().nonnegative() }),
    source,
  }),
} as const;
export type WorkspaceNotification = z.infer<typeof workspaceNotification>;
