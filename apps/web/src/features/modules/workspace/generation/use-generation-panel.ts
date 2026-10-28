"use client";

// The mounted reads of the WS-22 document-agent panel, and the one place a
// planned action is sent.
//
// Every response is read through the *operation's own* closed receiving schema,
// so a drifted or absent shape is refused and rendered as no data rather than
// coerced into the panel - a mismeasured response must never look like a
// document state.
//
// `useGenerationDispatch` resolves the canonical Capiro client, so it is only
// called by a component that mounts once a document state was actually admitted
// (see `GenerationPanelHost`). That keeps the panel renderable in a tree without
// a signed-in boundary, where neither the reads nor the panel appear.
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { workspaceGenerationOperations } from "../../../../shared/capiro/operations/workspace-generation";
import type { ResolvedWorkspaceRole } from "./access";
import {
  authorizeGenerationDispatch,
  classifyGenerationFailure,
  generationRecovery,
  nativeAdmissionOutcome,
  type GenerationPlan,
  type GenerationRequestInput,
} from "./controller";
import {
  isNativeGenerationOperation,
  type WorkspaceGenerationOperationKey,
} from "./owner-map";

const operations = workspaceGenerationOperations;

function read<S extends z.ZodType>(
  schema: S,
  data: unknown,
): z.output<S> | undefined {
  const parsed = schema.safeParse(data);
  return parsed.success ? parsed.data : undefined;
}

export type GenerationReads = ReturnType<typeof useGenerationReads>;

/**
 * What actually happened to a dispatched plan. `applied` carries the raw
 * response so a caller can read its own operation's closed schema; the other
 * outcomes mean nothing was confirmed to the server, and `unconfirmed` in
 * particular means the caller must reconcile (same request, never a resend).
 */
export type GenerationDispatchOutcome =
  | { kind: "applied"; result: unknown }
  | { kind: "unconfirmed"; reason: string }
  | { kind: "refused"; reason: string }
  | { kind: "blocked"; reason: string };

/**
 * The mounted reads of one document scope.
 *
 * The status read is the only one of them that can ADVANCE a run this panel
 * retains: it reconciles a definitive native failure, or a body the owner has
 * published, and it answers with the run ALONE, pinned at the revision that run
 * was admitted under. The state and proposal reads were answered BEFORE that
 * happened, so updating `run` on its own would leave the panel showing an
 * in-flight run (explicit retry disabled) and never list the admitted proposal,
 * until something remounted the view.
 *
 * An answer that belongs to the retained, still-open run therefore re-issues the
 * authoritative state and proposal reads exactly ONCE for that answer: the current
 * revision, the settled run and the admitted proposal then appear without a
 * remount, a paid replay or a poll. Nothing is synthesized from `{ run }`, and the
 * status read is never re-issued from here.
 *
 * "Once per answer" is per COMPLETED READ, not per run summary: an answer that
 * admits a body still reports the run exactly as it was retained (same requestId,
 * same `active` status, same expectedRevision) and differs only in the state and
 * proposals it implies. Keying on the summary would therefore let the first answer
 * suppress a later, genuinely different one.
 */
export function useGenerationReads(draftId: string) {
  const state = useCapiroQuery("workspace.generation.state", {
    params: { draftId },
  });
  const proposals = useCapiroQuery("workspace.generation.proposals", {
    params: { draftId },
  });
  const generation = useCapiroQuery("workspace.generation.status", {
    params: { draftId },
  });
  const quality = useCapiroQuery("workspace.generation.quality", {
    params: { draftId },
  });
  const capability = useCapiroQuery(
    "workspace.generation.intake.capability",
    {},
  );
  const agent = read(
    operations["workspace.generation.state"].response,
    state.data,
  );
  const activeRunId = agent?.state.generation.activeRunId;
  const runQuery = useCapiroQuery(
    "workspace.generation.run.status",
    { params: { runId: activeRunId ?? "" } },
    { enabled: Boolean(activeRunId) },
  );
  // `?? undefined` keeps the closed schema's nullable `run` out of the panel's own
  // surface: a run this panel has not read is absent, never a present null.
  const statusRun =
    read(operations["workspace.generation.status"].response, generation.data)?.run ??
    undefined;
  const retainedRun = agent?.state.generation.lastRun;
  // The ANSWER, not the run summary inside it: this is the completed read that has to
  // be acted on once, and the summary cannot tell two completed reads apart.
  const answeredRun =
    retainedRun?.status === "active" &&
    statusRun?.requestId !== undefined &&
    statusRun.requestId === retainedRun.requestId
      ? generation.data
      : undefined;
  const reconciled = useRef<unknown>(undefined);
  useEffect(() => {
    if (answeredRun === undefined || reconciled.current === answeredRun) return;
    reconciled.current = answeredRun;
    state.reload();
    proposals.reload();
  }, [answeredRun, state.reload, proposals.reload]);
  return {
    agent: agent?.state,
    proposals:
      read(
        operations["workspace.generation.proposals"].response,
        proposals.data,
      )?.proposals ?? [],
    run: statusRun,
    quality: read(
      operations["workspace.generation.quality"].response,
      quality.data,
    ),
    capability: read(
      operations["workspace.generation.intake.capability"].response,
      capability.data,
    ),
    runStatus: read(
      operations["workspace.generation.run.status"].response,
      runQuery.data,
    ),
    loading: state.loading,
    error: state.error,
    reload: () => {
      state.reload();
      proposals.reload();
      generation.reload();
      quality.reload();
      if (activeRunId) runQuery.reload();
    },
  };
}

/** The refusal a caller shows when an unconfirmed generation result comes back. */
const unconfirmedGeneration =
  "That generation request is unconfirmed. The current document was re-read; review it before acting again.";

/** The refusal a caller shows when any other action's result is unconfirmed. */
const unconfirmedResult =
  "The result of that action is unconfirmed. The current document was re-read; review it before acting again.";

/**
 * What an accepted response means, decided by the operation's own closed schema:
 * a supported generated phase answers with its admission, and anything that does
 * not parse is an UNCONFIRMED admission rather than a success. `settle` marks the
 * outcomes after which the caller's reads must be re-issued.
 */
function classifyDispatchResult(
  operation: WorkspaceGenerationOperationKey,
  result: unknown,
  label: string,
): { notice: string; outcome: GenerationDispatchOutcome; settle: boolean } {
  if (!isNativeGenerationOperation(operation))
    return { notice: `${label} applied.`, outcome: { kind: "applied", result }, settle: true };
  const admitted = read(operations[operation].response, result) as
    | {
        status: "result" | "proposed" | "approval-required" | "unknown";
        proposal: { proposalId: string } | null;
      }
    | undefined;
  // The owner could not confirm the exact request: the caller re-reads and
  // decides, and the turn is never re-issued blindly.
  if (
    generationRecovery(nativeAdmissionOutcome(admitted?.status ?? "unknown")) ===
    "reconcile"
  )
    return {
      notice: "",
      outcome: { kind: "unconfirmed", reason: unconfirmedGeneration },
      settle: true,
    };
  return {
    notice: admitted?.proposal
      ? `${label}: pending proposal ${admitted.proposal.proposalId}.`
      : `${label} applied.`,
    outcome: { kind: "applied", result },
    settle: true,
  };
}

/** The outcomes in which nothing was confirmed to the server. */
export type GenerationDispatchFailure = Extract<
  GenerationDispatchOutcome,
  { kind: "unconfirmed" | "refused" }
>;

/**
 * An unconfirmed result is never retried: the caller must review the current
 * document before another attempt. Every other failure is a definite refusal.
 */
function classifyDispatchFailure(caught: unknown): GenerationDispatchFailure {
  if (generationRecovery(classifyGenerationFailure(caught)) === "reconcile")
    return { kind: "unconfirmed", reason: unconfirmedResult };
  return {
    kind: "refused",
    reason: caught instanceof Error ? caught.message : "The action was not applied.",
  };
}

/**
 * Whether the caller's lifetime is still current. `guard` is the caller's OWN
 * existing lifetime check — for a retained attempt, the journal guard it already
 * holds — which throws once that attempt's scope was disposed or replaced (a
 * different account, document or revision, or a re-hydration). A caller with no
 * lifetime to check passes nothing and publication is unchanged.
 */
export function scopeIsCurrent(guard?: () => void): boolean {
  if (!guard) return true;
  try {
    guard();
    return true;
  } catch {
    return false;
  }
}

export function useGenerationDispatch(
  role: ResolvedWorkspaceRole,
  onSettled: () => void,
) {
  // One cast, at the single place a plan meets the typed client: the plan was
  // built by that operation's own planner and the decision below has already
  // refused anything this consumer does not declare.
  const server = useCapiro() as unknown as {
    request: (
      operation: WorkspaceGenerationOperationKey,
      input: GenerationRequestInput,
    ) => Promise<unknown>;
  };
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  // The lifetime of this hook's OWN control state. Only the most recently
  // dispatched request owns the busy flag, so a request that settles late cannot
  // clear the busy state of the request that replaced it. It is this hook's own
  // existing control state - not a second identity owner for any attempt: the
  // request identity a caller reconciles with is still the plan's own.
  const latest = useRef(0);
  async function dispatch(
    plan: GenerationPlan,
    label: string,
    guard?: () => void,
  ): Promise<GenerationDispatchOutcome> {
    const decision = authorizeGenerationDispatch(plan, role);
    if (!decision.allowed) {
      setNotice("");
      setFailure(decision.reason);
      return { kind: "blocked", reason: decision.reason };
    }
    if (plan.kind !== "request")
      return {
        kind: "blocked",
        reason:
          plan.kind === "replay"
            ? "That request was already submitted."
            : plan.reason,
      };
    const mine = ++latest.current;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      const result = await server.request(plan.operation, plan.input);
      const classified = classifyDispatchResult(plan.operation, result, label);
      const outcome = classified.outcome;
      // The request resolved, but the caller's scope may have been disposed or
      // replaced while it was in flight (another account, another document,
      // another revision). Nothing about THIS attempt may be published into the
      // scope that replaced it: no notice, no reload, no failure. The outcome is
      // still returned — guarding the caller's own reads is the caller's job.
      if (scopeIsCurrent(guard)) {
        setNotice(classified.notice);
        if (classified.settle) onSettled();
        if (outcome.kind !== "applied") setFailure(outcome.reason);
      }
      return outcome;
    } catch (caught) {
      const outcome = classifyDispatchFailure(caught);
      if (scopeIsCurrent(guard)) {
        if (outcome.kind === "unconfirmed") onSettled();
        setFailure(outcome.reason);
      }
      return outcome;
    } finally {
      // The busy flag is this hook's own control state, not a publication of the
      // attempt's outcome. It is cleared by the request that still owns it: a
      // request that settled after a LATER one was dispatched must not clear that
      // later request's busy state, and a replaced scope is never left with a
      // control stuck busy by an attempt that is no longer its own.
      if (latest.current === mine) setBusy(false);
    }
  }
  return { busy, notice, failure, dispatch };
}
