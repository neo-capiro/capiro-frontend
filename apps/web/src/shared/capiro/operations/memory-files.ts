import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "Core memory.controller.ts itemSections/catalog and memory-catalog.ts";
const section = z.object({
  key: z.string(),
  heading: z.string(),
  owner: z.enum(["human", "engine"]),
  body: z.string(),
  prompt: z.string(),
  example: z.string(),
});
export const memoryFilesOperations = {
  "settings.memory.files.catalog": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/catalog",
    source,
    request: z.object({}).strict(),
    response: z.array(
      z.object({
        type: z.string(),
        scope: z.enum(["firm", "client", "user"]),
        label: z.string(),
        blurb: z.string(),
        sections: z.array(
          z.object({
            key: z.string(),
            heading: z.string(),
            prompt: z.string(),
            example: z.string(),
          }),
        ),
      }),
    ),
  }),
  "settings.memory.files.sections": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/items/:type/:slug/sections",
    source,
    request: z
      .object({
        params: z
          .object({
            type: z.string().min(1).max(100),
            slug: z.string().min(1).max(200),
          })
          .strict(),
      })
      .strict(),
    response: z
      .object({
        type: z.string(),
        slug: z.string(),
        title: z.string(),
        visibility: z.enum(["user", "tenant"]),
        clientId: z.string().uuid().nullable(),
        updatedAt: z.string().datetime({ offset: true }).nullable(),
        exists: z.boolean(),
        pendingReview: z
          .object({
            candidateId: z.string().uuid(),
            status: z.literal("pending_review"),
            submittedAt: z.string().datetime({ offset: true }),
          })
          .nullable(),
        sections: z.array(section),
      })
      .strict(),
  }),
} as const;
