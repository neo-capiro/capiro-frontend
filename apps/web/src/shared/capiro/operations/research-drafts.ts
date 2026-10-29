import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "capiro-backend@fba7ed5d1 research-portfolios.controller.ts; research-portfolio-institutional.service.ts; meri.controller.ts createArtifactVersion";
export const researchDraft = z.object({
  artifactId: z.uuid(),
  portfolioId: z.uuid(),
  conversationId: z.uuid(),
  parentArtifactId: z.uuid().nullable(),
  title: z.string(),
  kind: z.string(),
  contentType: z.string(),
  bodyText: z.string().max(500000),
  reviewStatus: z.string(),
  createdAt: z.string(),
  childVersions: z
    .array(
      z.object({
        artifactId: z.uuid(),
        title: z.string(),
        createdAt: z.string(),
        reviewStatus: z.string(),
      }),
    )
    .max(20),
  childVersionsHasMore: z.boolean(),
});
export const researchDraftOperations = {
  "research.drafts.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/drafts/:artifactId",
    request: z
      .object({
        params: z.object({ id: z.uuid(), artifactId: z.uuid() }).strict(),
      })
      .strict(),
    response: researchDraft,
    source,
  }),
  "research.drafts.version": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/artifacts/:artifactId/version",
    // Existing writer allows 500,000 UTF-16 code units; JSON escaping can use six bytes per unit.
    requestLimitBytes: 3_100_000,
    request: z
      .object({
        params: z.object({ artifactId: z.uuid() }).strict(),
        body: z.object({ bodyText: z.string().max(500000) }).strict(),
      })
      .strict(),
    response: z.object({ id: z.uuid() }),
    source,
  }),
};
