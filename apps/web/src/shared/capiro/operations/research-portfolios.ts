import { z } from "zod";
import { defineOperation } from "../contracts";
import * as s from "./research-schemas";
const source =
  "apps/api/src/research-portfolios/research-portfolios.controller.ts; packages/shared/src/research-portfolios.ts @ 4be13b0";
const params = z.object({ id: z.uuid() }).strict(),
  metadata = z.object({
    idempotencyKey: z.string().min(1).max(200),
    expectedRevision: z.number().int().min(0),
  });
const read = <R extends z.ZodType>(path: string, response: R) =>
  defineOperation({
    service: "core",
    method: "GET",
    path,
    request: z.object({ params }).strict(),
    response,
    source,
  });
const write = <B extends z.ZodType, R extends z.ZodType>(
  method: "POST" | "PATCH",
  path: string,
  body: B,
  response: R,
) =>
  defineOperation({
    service: "core",
    method,
    path,
    request: z.object({ params, body }).strict(),
    response,
    source,
  });
export const researchPortfolioOperations = {
  "research.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios",
    request: z
      .object({
        query: z
          .object({
            cursor: z.string().optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      items: z.array(s.researchSummary),
      nextCursor: z.string().nullable(),
    }),
    source,
  }),
  "research.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios",
    request: z
      .object({
        body: z
          .object({
            idempotencyKey: z.string().min(1).max(200),
            name: z.string().trim().min(1).max(240),
            purpose: z.string().max(4000).nullable().optional(),
            mode: z.enum(["manual", "rules", "hybrid"]).optional(),
          })
          .strict(),
      })
      .strict(),
    response: s.researchReceipt,
    source,
  }),
  "research.detail": read("/research-portfolios/:id", s.researchDetail),
  "research.update": write(
    "PATCH",
    "/research-portfolios/:id",
    metadata
      .extend({
        name: z.string().trim().min(1).max(240).optional(),
        purpose: z.string().max(4000).nullable().optional(),
        mode: z.enum(["manual", "rules", "hybrid"]).optional(),
      })
      .strict(),
    s.researchReceipt,
  ),
  "research.archive": write(
    "POST",
    "/research-portfolios/:id/archive",
    metadata.strict(),
    s.researchReceipt,
  ),
  "research.restore": write(
    "POST",
    "/research-portfolios/:id/restore",
    metadata.strict(),
    s.researchReceipt,
  ),
  "research.members.add": write(
    "POST",
    "/research-portfolios/:id/members",
    metadata
      .extend({
        targetKind: s.researchMember.shape.targetKind,
        targetId: z.string().min(1).max(300),
        label: z.string().max(500).nullable().optional(),
      })
      .strict(),
    s.researchReceipt,
  ),
  "research.members.decide": write(
    "POST",
    "/research-portfolios/:id/members/decisions",
    metadata
      .extend({
        decisions: z
          .array(
            z
              .object({
                memberId: z.uuid(),
                disposition: z.enum(["included", "excluded"]),
                reason: z.string().trim().min(1).max(4000),
              })
              .strict(),
          )
          .min(1)
          .max(100),
      })
      .strict(),
    s.researchReceipt,
  ),
  "research.clients.link": write(
    "POST",
    "/research-portfolios/:id/client-links",
    metadata.extend({ clientId: z.uuid() }).strict(),
    s.researchReceipt,
  ),
  "research.clients.unlink": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/research-portfolios/:id/client-links/:clientId",
    request: z
      .object({
        params: params.extend({ clientId: z.uuid() }),
        body: metadata.strict(),
      })
      .strict(),
    response: s.researchReceipt,
    source,
  }),
  "research.grants.put": defineOperation({
    service: "core",
    method: "PUT",
    path: "/research-portfolios/:id/grants/:principalId",
    request: z
      .object({
        params: params.extend({ principalId: z.uuid() }),
        body: metadata
          .extend({
            principalType: z.literal("user"),
            role: z.enum(["owner", "editor", "viewer"]),
          })
          .strict(),
      })
      .strict(),
    response: s.researchReceipt,
    source,
  }),
  "research.grants.remove": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/research-portfolios/:id/grants/:principalId",
    request: z
      .object({
        params: params.extend({ principalId: z.uuid() }),
        body: metadata.strict(),
      })
      .strict(),
    response: s.researchReceipt,
    source,
  }),
  "research.analytics": read(
    "/research-portfolios/:id/analytics",
    s.researchAnalytics,
  ),
  "research.fit": read("/research-portfolios/:id/fit", s.researchFit),
  "research.changes": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/changes",
    request: z
      .object({
        params,
        query: z
          .object({
            cursor: z.string().optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      items: z.array(
        s.researchEvent.extend({ state: s.researchState.nullable() }),
      ),
      nextCursor: z.string().nullable(),
    }),
    source,
  }),
  "research.changes.state": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/research-portfolios/:id/changes/:eventId/state",
    request: z
      .object({
        params: params.extend({ eventId: z.uuid() }),
        body: z
          .object({
            action: z.enum(["seen", "acknowledged", "dismissed", "undo"]),
            expectedRevision: z.number().int().min(0).optional(),
          })
          .strict(),
      })
      .strict(),
    response: s.researchState,
    source,
  }),
  "research.reviews": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/reviews",
    request: z
      .object({
        params,
        query: z
          .object({
            lane: z.enum(["mine", "team", "deferred", "resolved"]).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(s.researchReview),
    source,
  }),
  "research.reviews.decide": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/reviews/:reviewId/decision",
    request: z
      .object({
        params: params.extend({ reviewId: z.uuid() }),
        body: metadata
          .extend({
            expectedPortfolioRevision: z.number().int().min(0),
            decisionType: z.enum([
              "include",
              "exclude",
              "defer",
              "reopen",
              "dispute",
            ]),
            reason: z.string().trim().min(1).max(4000),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      portfolioId: z.string(),
      actorUserId: z.string(),
      occurredAt: z.string(),
      outcomes: z.array(
        z.object({
          reviewId: z.string().nullable(),
          status: z.enum([
            "assigned",
            "decided",
            "unchanged",
            "conflict",
            "failed",
            "note_added",
          ]),
          revision: z.number().nullable(),
          message: z.string().nullable(),
        }),
      ),
    }),
    source,
  }),
  "research.snapshots": read(
    "/research-portfolios/:id/snapshots",
    z.array(s.researchSnapshot),
  ),
  "research.snapshots.create": write(
    "POST",
    "/research-portfolios/:id/snapshots",
    z
      .object({
        operationKey: z.string().min(1).max(200),
        name: z.string().trim().min(1).max(240),
        expectedRevision: z.number().int().min(0),
      })
      .strict(),
    s.researchSnapshot,
  ),
  "research.subscriptions": read(
    "/research-portfolios/:id/subscriptions",
    z.array(s.researchSubscription),
  ),
  "research.subscriptions.create": write(
    "POST",
    "/research-portfolios/:id/subscriptions",
    z
      .object({
        targetKind: z.literal("portfolio"),
        targetId: z.uuid(),
        channel: z.enum(["in_app", "email"]),
        cadence: z.enum(["immediate", "daily", "weekly"]),
      })
      .strict(),
    s.researchSubscription,
  ),
  "research.subscriptions.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/research-portfolios/:id/subscriptions/:subscriptionId",
    request: z
      .object({
        params: params.extend({ subscriptionId: z.uuid() }),
        body: z
          .object({
            active: z.boolean().optional(),
            channel: z.enum(["in_app", "email"]).optional(),
            cadence: z.enum(["immediate", "daily", "weekly"]).optional(),
          })
          .strict(),
      })
      .strict(),
    response: s.researchSubscription,
    source,
  }),
} as const;
