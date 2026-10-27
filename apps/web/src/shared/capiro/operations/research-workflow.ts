import { z } from "zod";
import { defineOperation } from "../contracts";
import { researchFit } from "./research-schemas";
const source =
  "capiro-backend@fba7ed5d1 packages/shared/src/research-portfolios.ts; research-portfolios.controller.ts; research-portfolio-phase11.service.ts";
const params = z.object({ id: z.uuid() }).strict();
const bookmarkParams = params.extend({ bookmarkId: z.uuid() }).strict();
export const researchBookmarkKinds = [
  "member",
  "snapshot",
  "evidence",
  "review",
  "import",
  "output",
  "other",
] as const;
export const researchBookmark = z.object({
  id: z.uuid(),
  portfolioId: z.uuid(),
  targetKind: z.enum(researchBookmarkKinds),
  targetId: z.string(),
  label: z.string().nullable(),
  note: z.string().nullable(),
  updatedAt: z.string(),
});
const note = z.object({
  id: z.uuid(),
  reviewId: z.uuid(),
  authorUserId: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export const researchOperation = z.object({
  id: z.string(),
  portfolioId: z.uuid(),
  kind: z.enum(["import", "recompute", "output", "snapshot", "client_filing"]),
  status: z.string(),
  actorUserId: z.string().nullable(),
  domainStatus: z.string(),
  limitations: z.array(z.string()),
  label: z.string().nullable(),
  lastError: z.string().nullable(),
  retryCount: z.number(),
  updatedAt: z.string(),
});
const tourParams = z
  .object({ tourVersion: z.string().regex(/^[a-zA-Z0-9._-]{1,100}$/) })
  .strict();
const tour = z.object({
  tourVersion: z.string(),
  status: z.enum(["active", "dismissed", "completed"]),
  completedAt: z.string().nullable(),
});
export const researchWatchPreview = z.object({
  portfolioId: z.uuid(),
  expectedRevision: z.number(),
  previewHash: z.string(),
  legacyWatches: z.number(),
  convertibleWatches: z.number(),
  alreadyConverted: z.number(),
  limitations: z.array(z.string()),
  previewItems: z.array(
    z.object({
      watchId: z.string(),
      userId: z.string(),
      channel: z.string(),
      legacyKind: z.string(),
      targetKind: z.literal("program_element"),
      targetId: z.string(),
      active: z.literal(false),
      reason: z.string(),
      willConvert: z.boolean(),
    }),
  ),
});
export const researchWorkflowOperations = {
  "research.bookmarks": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/bookmarks",
    request: z.object({ params }).strict(),
    response: z.array(researchBookmark),
    source,
  }),
  "research.bookmarks.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/bookmarks",
    request: z
      .object({
        params,
        body: z
          .object({
            idempotencyKey: z.string().min(1).max(128),
            targetKind: z.enum(researchBookmarkKinds),
            targetId: z.string().min(1).max(256),
            label: z.string().max(255).nullable().optional(),
            note: z.string().max(5000).nullable().optional(),
          })
          .strict(),
      })
      .strict(),
    response: researchBookmark,
    source,
  }),
  "research.bookmarks.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/research-portfolios/:id/bookmarks/:bookmarkId",
    request: z
      .object({
        params: bookmarkParams,
        body: z
          .object({
            label: z.string().max(255).nullable().optional(),
            note: z.string().max(5000).nullable().optional(),
          })
          .strict(),
      })
      .strict(),
    response: researchBookmark,
    source,
  }),
  "research.bookmarks.delete": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/research-portfolios/:id/bookmarks/:bookmarkId",
    request: z.object({ params: bookmarkParams }).strict(),
    response: z.unknown(),
    source,
  }),
  "research.reviews.assign": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/reviews/:reviewId/assign",
    request: z
      .object({
        params: params.extend({ reviewId: z.uuid() }).strict(),
        body: z
          .object({
            idempotencyKey: z.string().min(1).max(128),
            expectedRevision: z.number().int().nonnegative(),
            expectedPortfolioRevision: z.number().int().nonnegative(),
            assigneeUserId: z.string().nullable(),
            reason: z.string().trim().min(1).max(4000),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      portfolioId: z.uuid(),
      outcomes: z.array(
        z.object({
          reviewId: z.string().nullable(),
          status: z.string(),
          revision: z.number().nullable(),
          message: z.string().nullable(),
        }),
      ),
    }),
    source,
  }),
  "research.reviews.note": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/reviews/:reviewId/notes",
    request: z
      .object({
        params: params.extend({ reviewId: z.uuid() }).strict(),
        body: z
          .object({
            idempotencyKey: z.string().min(1).max(128),
            expectedRevision: z.number().int().nonnegative(),
            body: z.string().trim().min(1).max(5000),
          })
          .strict(),
      })
      .strict(),
    response: note,
    source,
  }),
  "research.reviews.notes": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/reviews/:reviewId/notes",
    request: z
      .object({ params: params.extend({ reviewId: z.uuid() }).strict() })
      .strict(),
    response: z.array(note),
    source,
  }),
  "research.fit.refresh": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/fit/refresh",
    request: z.object({ params }).strict(),
    response: researchFit,
    source,
  }),
  "research.watch.preview": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/watch-conversion/preview",
    request: z.object({ params }).strict(),
    response: researchWatchPreview,
    source,
  }),
  "research.watch.apply": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/watch-conversion/apply",
    request: z
      .object({
        params,
        body: z
          .object({
            idempotencyKey: z.string().min(1).max(128),
            expectedRevision: z.number().int().nonnegative(),
            previewHash: z.string().min(1),
            selectedWatchIds: z.array(z.string()).min(1),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      portfolioId: z.uuid(),
      revision: z.number(),
      convertedCount: z.number(),
      skippedCount: z.number(),
      limitations: z.array(z.string()),
    }),
    source,
  }),
  "research.operations.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/operations/:operationId",
    request: z
      .object({
        params: params
          .extend({ operationId: z.string().min(1).max(200) })
          .strict(),
      })
      .strict(),
    response: researchOperation,
    source,
  }),
  "research.operations.reconcile": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/operations/:operationId/reconcile",
    request: z
      .object({
        params: params
          .extend({ operationId: z.string().min(1).max(200) })
          .strict(),
        body: z
          .object({ operationKey: z.string().min(1).max(200).optional() })
          .strict(),
      })
      .strict(),
    response: researchOperation,
    source,
  }),
  "research.tour": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/tour-state/:tourVersion",
    request: z.object({ params: tourParams }).strict(),
    response: tour,
    source,
  }),
  "research.tour.update": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/tour-state/:tourVersion",
    request: z
      .object({
        params: tourParams,
        body: z
          .object({ status: z.enum(["active", "dismissed", "completed"]) })
          .strict(),
      })
      .strict(),
    response: tour,
    source,
  }),
};
