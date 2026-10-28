// WS-22 planners for the five SUPPORTED generated phases: brief synthesis,
// context recommend, context analyze, outline generation and the document run.
//
// These are the only plans in this feature that carry a paid-generation intent.
// The Workspace route behind each operation serves the phase with ONE canonical
// native conversation SDK turn through the approved greenfield Meri owner
// (`apps/workspace/src/document-agent/native-generation.bridge.ts`) and admits
// the result through the existing Workspace state/revision/approval owners, so
// each planner pins `expectedRevision` from the state it was given and mirrors
// the server's own phase gate rather than offering a request the server would
// refuse.
import type {
  DocumentAgentState,
  GenerationMode,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { refusal, type GenerationPlan } from "./controller";
import type { WorkspaceGenerationOperationKey } from "./owner-map";
import { briefApproval, contextApproval, outlineApproval } from "./state";

/**
 * The truthful explicit paid-generation intent. It is a closed field of the
 * request body (`paidGeneration: true`) that the route's own DTO requires to be
 * exactly `true`, so the intent is declared where the request is declared and no
 * ordinary header (for example the idempotency key) is borrowed to mean
 * something else.
 */
function nativeRequest(
  operation: WorkspaceGenerationOperationKey,
  draftId: string,
  body: Record<string, unknown>,
): GenerationPlan {
  return {
    kind: "request",
    operation,
    input: {
      params: { draftId },
      body: { ...body, paidGeneration: true },
    },
  };
}

/**
 * POST /drafts/:draftId/agent/brief/synthesize — the server requires a goal
 * before it will spend a turn on the brief.
 */
export function planNativeBriefSynthesis(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  if (!state.goal?.text?.trim())
    return refusal("Set the document goal before synthesizing a brief.");
  return nativeRequest("workspace.generation.brief.synthesize", draftId, {
    expectedRevision: state.revision,
  });
}

/**
 * The context plan is built from the brief, so both context phases require the
 * brief objective the server requires — and only in the phase that admits it.
 */
function contextGate(
  state: DocumentAgentState,
  draftId: string,
  operation: WorkspaceGenerationOperationKey,
): GenerationPlan {
  if (!state.brief.objective)
    return refusal("Write the brief objective before building the context plan.");
  return nativeRequest(operation, draftId, { expectedRevision: state.revision });
}

export function planNativeContextRecommend(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  return contextGate(state, draftId, "workspace.generation.context.recommend");
}

export function planNativeContextAnalyze(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  return contextGate(state, draftId, "workspace.generation.context.analyze");
}

/**
 * POST /drafts/:draftId/agent/outline/generate — the sections come back as a
 * PENDING `outline_revision` proposal through the existing revision owner; this
 * planner never writes the outline. A blueprint must be pinned first, exactly as
 * the server requires.
 */
export function planNativeOutlineGeneration(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  if (!state.blueprintPin)
    return refusal("Pin a blueprint before generating an outline.");
  return nativeRequest("workspace.generation.outline.generate", draftId, {
    expectedRevision: state.revision,
  });
}

/**
 * POST /drafts/:draftId/agent/generation/retry — retry the units a terminal NATIVE
 * document run failed, through the same retained native request owner and as a
 * genuinely deliberate paid attempt.
 *
 * The plan is only offered for a run that actually carries a retained native
 * request (the server's own native-only selector) and that has settled: proposing a
 * retry while the run is still in flight, or for a legacy engine run, would be a
 * request the server refuses. The explicit intent is declared here, where the
 * request is declared — the check/recover path never sends it.
 */
export function planNativeDocumentRetry(
  state: DocumentAgentState,
  draftId: string,
): GenerationPlan {
  const run = state.generation.lastRun;
  if (run?.requestId === undefined)
    return refusal(
      "This document has no retained native generation run, so its units cannot be retried.",
    );
  if (run.status === "active")
    return refusal("The run is still in flight; retry its failed units once it has settled.");
  return {
    kind: "request",
    operation: "workspace.generation.document.retry",
    input: {
      params: { draftId },
      // `intent` is the deliberate paid form of this retry and is REQUIRED by the
      // route; `sectionIds` is omitted so the server scopes the attempt from the run's
      // own failed units. No `paidGeneration` field: this route's own closed body does
      // not carry one, and the intent is the acknowledgement it asks for.
      body: { expectedRevision: state.revision, intent: "retry-failed-units" },
    },
  };
}

export function planNativeGenerationStart(
  state: DocumentAgentState,
  draftId: string,
  mode?: GenerationMode,
): GenerationPlan {
  if (briefApproval(state).status !== "approved")
    return refusal("Approve the brief before starting generation.");
  if (contextApproval(state).status !== "approved")
    return refusal("Approve the context plan before starting generation.");
  if (outlineApproval(state).status !== "approved")
    return refusal("Approve the outline before starting generation.");
  return nativeRequest("workspace.generation.generate", draftId, {
    expectedRevision: state.revision,
    ...(mode === undefined ? {} : { mode }),
  });
}
