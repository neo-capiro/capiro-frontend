import { z } from "zod";
import { defineOperation } from "../contracts";
const source =
  "Core memory-governance.controller.ts and memory-governance-read/action.service.ts";
const id = z.string().uuid(),
  count = z.number().int().nonnegative(),
  nullable = z.string().nullable();
const version = z.string().min(1).max(200);
const empty = z.object({}).strict(),
  selected = z.object({ params: z.object({ id }).strict() }).strict();
const pageQuery = z.object({
  limit: z.number().int().min(1).max(250),
  cursor: z.string().max(4096).optional(),
});
export const governanceItem = z.object({
  id,
  version,
  title: z.string(),
  type: z.string(),
  clientId: nullable,
  clientName: nullable,
  memoryScope: z.string(),
  governedStatus: z.string(),
  legalHold: z.boolean(),
  reviewDueAt: nullable,
  updatedAt: z.string(),
  approvedByUserId: nullable,
  secondApprovedByUserId: nullable,
  capabilities: z.object({
    approve: z.boolean().optional(),
    confirm: z.boolean(),
    markStale: z.boolean(),
    revoke: z.boolean(),
    secondApprove: z.boolean(),
    proposeCorrection: z.boolean(),
    restore: z.boolean(),
    resolveConflict: z.boolean(),
  }),
});
const transition = z.object({
  id,
  memoryItemId: nullable,
  fromStatus: nullable,
  toStatus: z.string(),
  reason: z.string(),
  occurredAt: z.string(),
  actorUserId: nullable,
});
const job = z.object({
  id,
  version,
  operation: z.string(),
  status: z.string(),
  attempts: count,
  lastError: nullable,
  nextAttemptAt: z.string(),
});
const result = z.object({
  ok: z.literal(true),
  outcome: z.string(),
  itemId: id.optional(),
  jobId: id.optional(),
  governedStatus: z.string().optional(),
  status: z.string().optional(),
});
const mutation = (path: string, reason: boolean) =>
  defineOperation({
    service: "core",
    method: "POST",
    path,
    source,
    request: selected
      .extend({
        body: z
          .object({
            expectedVersion: version,
            ...(reason ? { reason: z.string().trim().min(1).max(2000) } : {}),
          })
          .strict(),
      })
      .strict(),
    response: result,
  });
export const memoryGovernanceOperations = {
  "settings.memory.governance.overview": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/governance",
    source,
    request: empty,
    response: z.object({
      enabled: z.boolean(),
      reviewEnabled: z.boolean(),
      pendingReviewCountStatus: z.enum(["complete", "unavailable"]),
      counts: z.object({
        active: count,
        pendingReview: count,
        conflicts: count,
        reviewDue: count,
        history: count,
        activeGrants: count,
        projectionAttention: count,
      }),
    }),
  }),
  "settings.memory.governance.items": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/governance/items",
    source,
    request: z
      .object({
        query: pageQuery
          .extend({
            bucket: z.enum([
              "all",
              "active",
              "review_due",
              "conflicts",
              "history",
            ]),
            q: z.string().max(200).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      enabled: z.boolean(),
      items: z.array(governanceItem),
      nextCursor: nullable,
    }),
  }),
  "settings.memory.governance.item": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/governance/items/:id",
    source,
    request: selected,
    response: z.object({
      enabled: z.boolean(),
      item: governanceItem
        .extend({
          sections: z.array(
            z.object({
              key: z.string(),
              heading: z.string(),
              body: z.string(),
            }),
          ),
          versions: z.array(
            z.object({
              id,
              title: z.string(),
              governedStatus: z.string(),
              createdAt: z.string(),
            }),
          ),
          transitions: z.array(transition),
          projection: z.array(job),
        })
        .nullable(),
    }),
  }),
  "settings.memory.governance.transitions": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/governance/transitions",
    source,
    request: z.object({ query: pageQuery.strict() }).strict(),
    response: z.object({
      enabled: z.boolean(),
      transitions: z.array(transition),
      nextCursor: nullable,
    }),
  }),
  "settings.memory.governance.projections": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/governance/projection-health",
    source,
    request: empty,
    response: z.object({
      enabled: z.boolean(),
      counts: z.object({
        pending: count,
        running: count,
        failed: count,
        completed: count,
        deadLetter: count,
        superseded: count,
      }),
      oldestDueAt: nullable,
      recentFailures: z.array(
        job.extend({ memoryItemId: nullable, title: nullable }),
      ),
      recentFailuresPage: z.object({
        limit: count,
        returned: count,
        hasMore: z.boolean(),
      }),
    }),
  }),
  "settings.memory.governance.job": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/governance/projection-jobs/:id",
    source,
    request: selected,
    response: z.object({
      enabled: z.boolean(),
      job: z
        .object({
          id,
          version,
          status: z.string(),
          attempts: count,
          lastError: nullable,
        })
        .nullable(),
    }),
  }),
  "settings.memory.governance.approve": mutation(
    "/memory/governance/items/:id/approve",
    true,
  ),
  "settings.memory.governance.confirm": mutation(
    "/memory/governance/items/:id/confirm",
    false,
  ),
  "settings.memory.governance.markStale": mutation(
    "/memory/governance/items/:id/mark-stale",
    true,
  ),
  "settings.memory.governance.revoke": mutation(
    "/memory/governance/items/:id/revoke",
    true,
  ),
  "settings.memory.governance.secondApprove": mutation(
    "/memory/governance/items/:id/second-approve",
    false,
  ),
  "settings.memory.governance.retry": mutation(
    "/memory/governance/projection-jobs/:id/retry",
    false,
  ),
} as const;
export type GovernanceItem = z.infer<typeof governanceItem>;
