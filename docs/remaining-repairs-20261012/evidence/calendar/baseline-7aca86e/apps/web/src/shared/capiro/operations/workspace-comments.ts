import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceId } from "./workspace-schemas";

const source =
  "capirov2@4be13b0 apps/workspace/src/comments/comments.controller.ts, comments.service.ts and dto/comment.dto.ts";
const params = z.object({ documentId: workspaceId }).strict();
const comment = z.object({
  id: workspaceId,
  documentId: workspaceId,
  authorId: z.string(),
  role: z.string(),
  quote: z.string().nullable(),
  body: z.string(),
  resolved: z.boolean(),
  parentId: workspaceId.nullable(),
  createdAt: z.string(),
});
export const workspaceCommentOperations = {
  "workspace.comments": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/documents/:documentId/comments",
    request: z.object({ params }).strict(),
    response: z.array(comment.extend({ replies: z.array(comment).optional() })),
    source,
  }),
  "workspace.comment.create": defineOperation({
    service: "workspace",
    method: "POST",
    path: "/documents/:documentId/comments",
    request: z
      .object({
        params,
        body: z
          .object({
            body: z.string().trim().min(1).max(20000),
            quote: z.string().max(2000).optional(),
            parentId: workspaceId.optional(),
          })
          .strict(),
      })
      .strict(),
    response: comment,
    source,
  }),
  "workspace.comment.resolve": defineOperation({
    service: "workspace",
    method: "PATCH",
    path: "/documents/:documentId/comments/:commentId",
    request: z
      .object({
        params: params.extend({ commentId: workspaceId }).strict(),
        body: z.object({ resolved: z.boolean() }).strict(),
      })
      .strict(),
    response: comment,
    source,
  }),
};
