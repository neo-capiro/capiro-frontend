// WS-22 generation controller core: the plan shape, the reads a generation panel
// may issue, and the classification of a failed write. The planners themselves
// live in `plans.ts` (manual state-machine writes) and `intake.ts` (durable
// intake) so no file crosses the repository size-review threshold.
//
// Two rules are enforced here rather than in the panel:
//   * a read only ever reads (`mountReads` resolves to GET operations only);
//   * an ambiguous write is never retried blindly (`generationRecovery` sends the
//     caller back to a read before another write is allowed).
import type { DocumentAgentState } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { workspaceGenerationOperations } from "../../../../shared/capiro/operations/workspace-generation";
import {
  workspaceRoleCanEdit,
  workspaceRoleCanRead,
  workspaceRoleCanReview,
  type ResolvedWorkspaceRole,
} from "./access";
import {
  isMountedGenerationOperation,
  type WorkspaceGenerationOperationKey,
} from "./owner-map";
import type { IntakeRecoveryRecord } from "./intake-recovery";

export type GenerationRequestInput = {
  params?: Record<string, string>;
  body?: unknown;
  /** Only for an operation that declares an idempotent request identity. */
  idempotencyKey?: string;
};

export type GenerationPlan =
  | {
      kind: "request";
      operation: WorkspaceGenerationOperationKey;
      input: GenerationRequestInput;
    }
  | { kind: "replay"; entry: IntakeRecoveryRecord }
  | { kind: "refusal"; reason: string }
  | { kind: "withheld"; reason: string };

export function generationRequest(
  operation: WorkspaceGenerationOperationKey,
  params: Record<string, string>,
  body?: unknown,
): GenerationPlan {
  return body === undefined
    ? { kind: "request", operation, input: { params } }
    : { kind: "request", operation, input: { params, body } };
}

export function refusal(reason: string): GenerationPlan {
  return { kind: "refusal", reason };
}

/**
 * An action whose owner is not approved for this consumer: no request can be
 * built for it at all, so a mounted control renders the reason instead of a
 * button. The dispatch guard checks the same condition independently.
 */
export function withheld(reason: string): GenerationPlan {
  return { kind: "withheld", reason };
}

export function invalid(result: {
  error?: { issues: { message: string }[] };
}): string {
  return result.error?.issues[0]?.message ?? "The request is not valid.";
}

export type GenerationRead = {
  id: string;
  operation: WorkspaceGenerationOperationKey;
  params: Record<string, string>;
};

/**
 * The exact reads a generation panel may issue, and nothing else. Catalog and
 * capability are workspace-scoped; the rest are draft-scoped; the durable run
 * read is included only while the draft has an active run. Every returned entry
 * is asserted to be a GET by the feature tests.
 */
export function mountReads(
  draftId: string,
  state?: DocumentAgentState,
): GenerationRead[] {
  const reads: GenerationRead[] = [
    { id: "catalog", operation: "workspace.generation.catalog", params: {} },
    {
      id: "capability",
      operation: "workspace.generation.intake.capability",
      params: {},
    },
    {
      id: "state",
      operation: "workspace.generation.state",
      params: { draftId },
    },
    {
      id: "messages",
      operation: "workspace.generation.messages",
      params: { draftId },
    },
    {
      id: "proposals",
      operation: "workspace.generation.proposals",
      params: { draftId },
    },
    {
      id: "generation",
      operation: "workspace.generation.status",
      params: { draftId },
    },
    {
      id: "quality",
      operation: "workspace.generation.quality",
      params: { draftId },
    },
  ];
  const runId = state?.generation.activeRunId;
  if (runId)
    reads.push({
      id: "run",
      operation: "workspace.generation.run.status",
      params: { runId },
    });
  return reads;
}

export type GenerationOutcome =
  | "applied"
  | "stale-revision"
  | "stale-proposal"
  | "refused"
  | "unknown"
  | "failed";

type FailureShape = {
  status?: unknown;
  message?: unknown;
  upstreamCode?: unknown;
};

function conflictKind(text: string, code: string): GenerationOutcome {
  if (/proposal/i.test(text) || /proposal/i.test(code)) return "stale-proposal";
  return "stale-revision";
}

/**
 * Classify a failed write. A 409 is a real, resolvable conflict; a status-less
 * failure (timeout, aborted fetch, transport error) is `unknown` - the write may
 * well have landed, so the caller must read back before acting again.
 */
export function classifyGenerationFailure(error: unknown): GenerationOutcome {
  const shape = (error ?? {}) as FailureShape;
  const status = typeof shape.status === "number" ? shape.status : undefined;
  const message = typeof shape.message === "string" ? shape.message : "";
  const code = typeof shape.upstreamCode === "string" ? shape.upstreamCode : "";
  if (status === undefined) return "unknown";
  if (status === 409) return conflictKind(message, code);
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 422
  )
    return "refused";
  if (status >= 500) return "unknown";
  return "failed";
}

/** `reconcile` means: perform the corresponding read before any further write. */
export function generationRecovery(
  outcome: GenerationOutcome,
): "none" | "reconcile" {
  return outcome === "stale-revision" ||
    outcome === "stale-proposal" ||
    outcome === "unknown"
    ? "reconcile"
    : "none";
}

/**
 * The admission a SUCCEEDED native generation response reports. `unknown` means
 * the greenfield owner could not confirm the exact request: the caller must read
 * the same retained request back and review the document, exactly as for an
 * unconfirmed transport failure. A blind retry is never allowed — re-issuing the
 * turn either replays the identical derived request identity or starts a second
 * paid run, and only the owner can tell which.
 */
export function nativeAdmissionOutcome(
  status: "result" | "proposed" | "approval-required" | "unknown",
): GenerationOutcome {
  return status === "unknown" ? "unknown" : "applied";
}

export function operationMethod(
  operation: WorkspaceGenerationOperationKey,
): string {
  return workspaceGenerationOperations[operation].method;
}

/**
 * The capability the authoritative Workspace owner requires for each mounted
 * write (`collaborators/role-policy.ts` server-side). Reads need only a resolved
 * role. This mirrors the service predicates so a control is refused before a
 * request the service would reject anyway - it never grants one.
 */
const writeAuthority: Partial<
  Record<WorkspaceGenerationOperationKey, "edit" | "review">
> = {
  "workspace.generation.initialize": "edit",
  "workspace.generation.patch": "edit",
  "workspace.generation.brief.update": "edit",
  "workspace.generation.brief.synthesize": "edit",
  "workspace.generation.brief.approve": "edit",
  "workspace.generation.brief.reopen": "edit",
  "workspace.generation.context.recommend": "edit",
  "workspace.generation.context.analyze": "edit",
  "workspace.generation.context.approve": "edit",
  "workspace.generation.context.resolve": "edit",
  "workspace.generation.context.item": "edit",
  "workspace.generation.outline.update": "edit",
  "workspace.generation.outline.generate": "edit",
  "workspace.generation.outline.revise": "edit",
  "workspace.generation.outline.approve": "edit",
  "workspace.generation.generate": "edit",
  "workspace.generation.cancel": "edit",
  "workspace.generation.quality.fix": "edit",
  "workspace.generation.intake": "edit",
  "workspace.generation.proposal.accept": "review",
  "workspace.generation.proposal.reject": "review",
};

export type GenerationDispatchDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * The single dispatch decision for a planned action. An action whose owner is
 * unactivated is refused even though its request could be built, and a role
 * without the required capability is refused before the request is sent.
 */
export function authorizeGenerationDispatch(
  plan: GenerationPlan,
  role: ResolvedWorkspaceRole,
): GenerationDispatchDecision {
  if (plan.kind !== "request") return { allowed: true };
  if (!isMountedGenerationOperation(plan.operation))
    return {
      allowed: false,
      reason:
        "This action is not activated: its owner is not an approved Workspace or greenfield Meri owner yet.",
    };
  const authority = writeAuthority[plan.operation];
  if (authority === "edit" && !workspaceRoleCanEdit(role))
    return {
      allowed: false,
      reason:
        "Editing this document requires the owner, editor or reviewer role.",
    };
  if (authority === "review" && !workspaceRoleCanReview(role))
    return {
      allowed: false,
      reason:
        "Accepting or rejecting a proposal requires the owner, editor or reviewer role.",
    };
  if (!authority && !workspaceRoleCanRead(role))
    return { allowed: false, reason: "This document is not shared with you." };
  return { allowed: true };
}
