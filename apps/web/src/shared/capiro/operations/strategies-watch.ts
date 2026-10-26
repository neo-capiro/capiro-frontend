import { z } from "zod";
import { defineOperation } from "../contracts";
import { strategyDetail, strategyId } from "./strategies-schemas";

const source =
  "Core PR174 apps/api-strategy/src/agents/{agents.controller,watcher.service,watch-review.service,watch-source-dependencies}.ts; WatchReviewState, WatchProposalCard, WatchRecheckResult, watchSourceFindings";
const params = z.object({ strategyId }).strict();
const read = z.object({ params }).strict();
export const monitoring = z.object({
  strategyId,
  available: z.boolean(),
  schedulerEnabled: z.boolean(),
  mission: z
    .object({
      id: strategyId,
      state: z.string(),
      cadence: z.string().nullable(),
      nextRunAt: z.string().nullable(),
    })
    .nullable(),
  duplicateMissionCount: z.number().int().nonnegative(),
  lastRun: z
    .object({
      id: strategyId,
      state: z.string(),
      startedAt: z.string(),
      checkedAt: z.string().nullable(),
      error: z.string().nullable(),
      findingCount: z.number().nullable(),
    })
    .nullable(),
});
const recheck = z.object({
  state: z.enum(["complete", "failed"]),
  elapsedMs: z.number(),
  unchanged: z.array(
    z.object({ watchKey: z.string(), newProposalId: strategyId }),
  ),
  updated: z.array(
    z.object({ watchKey: z.string(), newProposalId: strategyId }),
  ),
  dropped: z.array(
    z.object({
      watchKey: z.string(),
      reason: z.string(),
      targetDeleted: z.boolean(),
    }),
  ),
});
export const watchState = z.object({
  strategyId,
  headVersionId: strategyId,
  mission: z
    .object({
      id: strategyId,
      state: z.string(),
      cadence: z.string().nullable(),
      lastRunAt: z.string().nullable(),
      nextRunAt: z.string().nullable(),
    })
    .nullable(),
  pendingCount: z.number().int().nonnegative(),
  proposals: z.array(
    z.object({
      id: strategyId,
      watchKey: z.string(),
      strategyVersionId: strategyId,
      sourceLabel: z.string(),
      sourceDate: z.string().nullable(),
      badges: z.array(
        z.enum(["out_of_order", "updated", "critical", "high_risk"]),
      ),
      title: z.string(),
      proposal: z.string(),
      impact: z.string(),
      why: z.string(),
      risk: z.string(),
      recheckStatus: z.enum(["unchanged", "updated"]).nullable(),
    }),
  ),
  lastRecheck: recheck.nullable().optional(),
  // Older services omit this field; absence is not a clean source assessment.
  sourceFindings: z
    .array(
      z.object({
        code: z.literal("cited-source-stale"),
        severity: z.literal("warning"),
        nodeIds: z.array(strategyId),
        message: z.string(),
        suggestion: z.string().optional(),
        category: z.literal("context"),
        title: z.string(),
        impact: z.string(),
        whyCompared: z.array(z.string()),
        sortRank: z.number(),
      }),
    )
    .optional(),
});
const accepted = z.object({
  strategy: strategyDetail,
  state: watchState,
  recheck,
});
const proposalRead = z
  .object({ params: z.object({ id: strategyId }).strict() })
  .strict();
export const strategiesWatchOperations = {
  "strategies.watch.monitoring": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/watch/strategies/:strategyId/monitoring",
    request: read,
    response: monitoring,
    source,
  }),
  "strategies.watch.configure": defineOperation({
    service: "strategy",
    method: "PATCH",
    path: "/agents/watch/strategies/:strategyId/monitoring",
    request: z
      .object({
        params,
        body: z
          .object({ mode: z.enum(["paused", "manual", "daily", "weekly"]) })
          .strict(),
      })
      .strict(),
    response: monitoring,
    source,
  }),
  "strategies.watch.state": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/watch/strategies/:strategyId",
    request: read,
    response: watchState,
    source,
  }),
  "strategies.watch.revalidate": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/watch/strategies/:strategyId/revalidate",
    request: z
      .object({
        params,
        query: z.object({ force: z.literal("true") }).strict(),
      })
      .strict(),
    response: watchState,
    source,
    timeoutMs: 180000,
  }),
  "strategies.watch.accept": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/watch/proposals/:id/accept",
    request: proposalRead,
    response: accepted,
    source,
    timeoutMs: 180000,
  }),
  "strategies.watch.dismiss": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/watch/proposals/:id/dismiss",
    request: proposalRead,
    response: watchState,
    source,
  }),
  "strategies.watch.accept-all": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/watch/strategies/:strategyId/accept-all",
    request: z
      .object({
        params,
        body: z
          .object({
            expectedVersionId: strategyId,
            proposalIds: z.array(strategyId).min(1).max(60),
          })
          .strict(),
      })
      .strict(),
    response: accepted,
    source,
    timeoutMs: 180000,
  }),
};
export type StrategyMonitoring = z.infer<typeof monitoring>;
export type StrategyWatchState = z.infer<typeof watchState>;
