import { z } from "zod";
import { defineOperation } from "../contracts";

const request = z
  .object({
    params: z.object({ token: z.string().regex(/^[0-9a-f]{64}$/) }).strict(),
  })
  .strict();

/** Closed, anonymous capability reads for the canonical Workspace sharing address. */
export const publicShareOperations = {
  "public-share.kind": defineOperation({
    service: "core",
    method: "GET",
    path: "/public/share/:token",
    request,
    response: z.object({
      available: z.boolean(),
      kind: z.enum(["research_portfolio", "workspace_document"]).optional(),
    }),
    source: "apps/api/src/research-portfolios/research-portfolio-share.controller.ts",
  }),
  "public-share.document": defineOperation({
    service: "workspace",
    method: "GET",
    path: "/public/workspace-share/:token",
    request,
    response: z.object({
      draftId: z.string(),
      versionId: z.string().nullable(),
      docTitle: z.string(),
      sections: z.array(
        z.object({ id: z.string(), title: z.string(), content: z.string() }),
      ),
    }),
    source:
      "apps/workspace/src/delivery/delivery.controller.ts (PublicShareController)",
  }),
} as const;
