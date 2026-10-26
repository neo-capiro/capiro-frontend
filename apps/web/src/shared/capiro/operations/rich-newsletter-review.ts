import { z } from "zod";
import { defineOperation } from "../contracts";
import { workspaceId } from "./workspace-schemas";

const request = z
  .object({ params: z.object({ id: workspaceId }).strict() })
  .strict();
const source =
  "capiro-backend@194ea531 packages/shared/src/newsletter-receiving.ts; apps/workspace/src/newsletters/newsletter.controller.ts review/comments";

// The feature receiver supplies the captured requested UUID to the actual
// public parser. Raw transport data is never a typed, self-bound review.
export const richNewsletterReviewOperations = {
  "workspace.richNewsletter.review": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents/:id/review",
    request,
    response: z.unknown(),
    source,
  }),
  "workspace.richNewsletter.comments": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/newsletters/documents/:id/comments",
    request,
    response: z.unknown(),
    source,
  }),
} as const;
