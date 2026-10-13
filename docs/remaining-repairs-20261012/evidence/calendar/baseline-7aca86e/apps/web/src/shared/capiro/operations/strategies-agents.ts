import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  emptyStrategyRequest,
  strategyDetail,
  strategyId,
  strategyParams,
} from "./strategies-schemas";

const source =
  "capirov2@4be13b0 apps/api-strategy/src/agents/agents.controller.ts and {runs,change-sets,execution,watcher}.service.ts; DTOs and Prisma models; meri/meri.types.ts PlanEdit projection";
const read = z.object({ params: strategyParams }).strict();
const planEdit = z.object({
  op: z.enum(["add", "update", "remove", "retime"]),
  nodeId: z.string().optional(),
  kind: z.string().optional(),
  subject: z.string().optional(),
  title: z.string().optional(),
  note: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  ownerUserId: z.string().nullable().optional(),
  startsOn: z.string().optional(),
  endsOn: z.string().nullable().optional(),
  openEnded: z.boolean().optional(),
  dependsOn: z.array(z.string()).optional(),
  sources: z
    .array(z.object({ section: z.string(), ref: z.string().optional() }))
    .optional(),
});
export const strategyChangeSet = z.object({
  id: strategyId,
  strategyId,
  summary: z.string(),
  ops: z.array(planEdit),
  risk: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum([
    "proposed",
    "approved",
    "rejected",
    "applied",
    "undone",
    "stale",
    "superseded",
  ]),
  strategyVersionId: strategyId,
  appliedVersionId: strategyId.nullable(),
  createdAt: z.string(),
  appliedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
});
const executionFindings = z.object({
  findings: z
    .array(
      z.object({
        code: z.string(),
        severity: z.string(),
        message: z.string(),
        title: z.string().optional(),
        impact: z.string().optional(),
        suggestion: z.string().optional(),
      }),
    )
    .optional(),
  execution: z
    .object({
      kind: z.enum(["workspace", "outreach"]),
      nodeId: strategyId,
      strategyId,
      missionId: strategyId,
      pinnedVersionId: strategyId.nullable(),
    })
    .optional(),
  tasks: z
    .array(
      z.object({
        type: z.string(),
        nodeId: strategyId,
        detail: z
          .object({
            title: z.string().optional(),
            label: z.string().optional(),
            subject: z.string().optional(),
            docTitle: z.string().optional(),
            product: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  results: z
    .record(
      z.string(),
      z.object({
        artifactRef: z.string().optional(),
        status: z.string().optional(),
        kind: z.string().optional(),
      }),
    )
    .optional(),
});
export const strategyRun = z.object({
  id: strategyId,
  missionId: strategyId,
  strategyId: strategyId.nullable(),
  state: z.enum([
    "queued",
    "planning",
    "waiting_for_input",
    "ready_for_review",
    "approved",
    "executing",
    "staged",
    "completed",
    "failed",
    "failed_recoverable",
    "failed_terminal",
    "canceled",
    "superseded",
  ]),
  trigger: z.enum(["manual", "scheduled", "event"]),
  findings: executionFindings.nullable(),
  waitingReason: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  heartbeatAt: z.string().nullable(),
  attempt: z.number(),
  retryOfRunId: strategyId.nullable(),
  supersededByRunId: strategyId.nullable(),
});
const opIndexes = z
  .object({
    opIndexes: z.array(z.number().int().min(0).max(59)).max(60).optional(),
  })
  .strict();
export const runApproval = z.object({
  runId: strategyId,
  state: z.string(),
  action: z.enum(["stage", "send"]),
  effect: z.string(),
  sendEnabled: z.boolean(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  approvalValid: z.boolean(),
  approvalInvalidReason: z.string().nullable(),
  changedFields: z.array(z.string()),
  binding: z.object({
    strategyId,
    strategyVersionId: strategyId.nullable(),
    nodeId: strategyId,
    subject: z.string(),
    body: z.string(),
    recipients: z.array(
      z.object({
        id: z.string().nullable(),
        name: z.string().nullable(),
        address: z.string().nullable(),
      }),
    ),
    channel: z.string(),
    grounded: z.boolean(),
    model: z.string().nullable(),
    sendEnabled: z.boolean(),
  }),
  warnings: z.object({
    fallbackContent: z.boolean(),
    groundingStatus: z.string().nullable(),
    openMaterialConflicts: z.number().int().nonnegative(),
    missingRequiredContext: z.array(z.string()),
    versionDrift: z.boolean(),
    pinnedVersionId: strategyId.nullable(),
    headVersionId: strategyId.nullable(),
    changedSinceReview: z.boolean(),
  }),
});
export const strategiesAgentOperations = {
  "strategies.proposals": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/change-sets",
    request: z
      .object({
        query: z
          .object({
            strategyId: strategyId.optional(),
            status: strategyChangeSet.shape.status.optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(strategyChangeSet),
    source,
  }),
  "strategies.proposal.approve": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/change-sets/:id/approve",
    request: z.object({ params: strategyParams, body: opIndexes }).strict(),
    response: strategyChangeSet,
    source,
  }),
  "strategies.proposal.reject": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/change-sets/:id/reject",
    request: read,
    response: strategyChangeSet,
    source,
  }),
  "strategies.proposal.apply": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/change-sets/:id/apply",
    request: z.object({ params: strategyParams, body: opIndexes }).strict(),
    response: strategyDetail,
    source,
  }),
  "strategies.proposal.undo": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/change-sets/:id/undo",
    request: read,
    response: strategyDetail,
    source,
  }),
  "strategies.runs": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/execution/runs",
    request: z
      .object({
        query: z
          .object({ strategyId: strategyId.optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(strategyRun),
    source,
  }),
  "strategies.run": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/runs/:id",
    request: read,
    response: strategyRun,
    source,
  }),
  "strategies.run.attempts": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/execution/runs/:id/attempts",
    request: read,
    response: z.array(strategyRun),
    source,
  }),
  "strategies.run.reconcile": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/execution/runs/:id/reconcile",
    request: read,
    response: z.object({
      runId: strategyId,
      findings: z.array(
        z.object({
          code: z.enum([
            "STRANDED_NO_HEARTBEAT",
            "RESERVATION_WITHOUT_ARTIFACT",
            "ARTIFACT_NOT_ADVANCED",
            "COMPLETED_WITHOUT_ARTIFACT",
            "DUPLICATE_ARTIFACT_REF",
            "TARGET_MISSING",
            "VERSION_DRIFT",
            "NODE_NOT_LIVE",
          ]),
          severity: z.enum(["auto", "human"]),
          detail: z.string(),
          transition: z
            .object({ to: strategyRun.shape.state, reason: z.string() })
            .nullable(),
          resolutions: z.array(z.string()).optional(),
        }),
      ),
      applied: z
        .object({ to: strategyRun.shape.state, reason: z.string() })
        .nullable(),
      needsHuman: z.boolean(),
    }),
    source,
  }),
  "strategies.run.resolve-reservation": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/execution/runs/:id/resolve-reservation",
    request: z
      .object({
        params: strategyParams,
        body: z.discriminatedUnion("action", [
          z
            .object({
              action: z.literal("adopt"),
              artifactRef: z.string().trim().min(1).max(200),
            })
            .strict(),
          z.object({ action: z.literal("release") }).strict(),
        ]),
      })
      .strict(),
    response: z.object({
      runId: strategyId,
      action: z.enum(["adopt", "release"]),
      nodeId: strategyId,
      artifactType: z.string(),
    }),
    source,
  }),
  "strategies.run.policy": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/execution/runs/:id/policy",
    request: read,
    response: z.object({
      runId: strategyId,
      state: z.string(),
      reason: z.string(),
      actions: z.array(z.string()),
      terminal: z.boolean(),
      timeoutMinutes: z.number().nullable(),
      attempt: z.number(),
      heartbeatAt: z.string().nullable(),
      retryOfRunId: strategyId.nullable(),
      supersededByRunId: strategyId.nullable(),
    }),
    source,
  }),
  "strategies.run.execute": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/execution/runs/:id/execute",
    request: read,
    response: strategyRun,
    source,
  }),
  "strategies.run.resume": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/execution/runs/:id/resume",
    request: read,
    response: strategyRun,
    source,
  }),
  "strategies.run.cancel": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/execution/runs/:id/cancel",
    request: read,
    response: strategyRun,
    source,
  }),
  "strategies.run.retry": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/execution/runs/:id/retry",
    request: read,
    response: strategyRun,
    source,
  }),
  "strategies.run.mark-failed": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/execution/runs/:id/mark-failed",
    request: z
      .object({
        params: strategyParams,
        body: z.object({ reason: z.string().max(2000).optional() }).strict(),
      })
      .strict(),
    response: strategyRun,
    source,
  }),
  "strategies.run.approval": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/execution/runs/:id/approval",
    request: read,
    response: runApproval,
    source,
  }),
  "strategies.run.approve": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/execution/runs/:id/approve",
    request: z
      .object({
        params: strategyParams,
        body: z
          .object({ contentHash: z.string().regex(/^[a-f0-9]{64}$/) })
          .strict(),
      })
      .strict(),
    response: runApproval,
    source,
  }),
  "strategies.firm-review.acknowledge": defineOperation({
    service: "strategy",
    method: "POST",
    path: "/agents/runs/:id/transition",
    request: z
      .object({
        params: strategyParams,
        body: z.object({ to: z.literal("completed") }).strict(),
      })
      .strict(),
    response: strategyRun,
    source,
  }),
  "strategies.firm-review": defineOperation({
    service: "strategy",
    method: "GET",
    path: "/agents/runs/firm-review",
    request: emptyStrategyRequest,
    response: z.array(strategyRun),
    source,
  }),
};
export type StrategyChangeSet = z.infer<typeof strategyChangeSet>;
export type StrategyRun = z.infer<typeof strategyRun>;
