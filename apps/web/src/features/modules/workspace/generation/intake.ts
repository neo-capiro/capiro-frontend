// WS-22 durable intake planning for the Workspace two-step draft owner
// (`quick-draft/two-step-draft.controller.ts`: POST /document-agent/intakes).
//
// The endpoint is idempotent on its `Idempotency-Key` header, so the key is
// derived (never invented ad hoc) by the scoped recovery leaf from the acting
// identity and the exact canonical request, and the same leaf decides whether
// an attempt may be sent, replayed, or must first be reconciled against the
// authoritative run read.
//
// The submit action is activated: the run this endpoint queues is drafted by
// the approved greenfield native conversation owner (see `owner-map.ts`), so a
// request built here is a real greenfield native generation. A request plan
// also hands the caller the identity it must retain, so an unconfirmed attempt
// is reconciled against the SAME request instead of being sent a second time.
import {
  intakeBody,
  type GenerationRunStatus,
  type IntakeBody,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { invalid, refusal, withheld, type GenerationPlan } from "./controller";
import {
  intakeRecoveryScope,
  reviewIntakeRecovery,
  type IntakeActor,
  type IntakeRecoveryRecord,
} from "./intake-recovery";
import { isMountedGenerationOperation } from "./owner-map";

export { intakeDigest } from "./intake-recovery";
export type { IntakeActor, IntakeRecoveryRecord } from "./intake-recovery";

/** Why a caller cannot build a request for the submit action, if it cannot. */
const intakeNotActivated =
  "Durable intake submission is not activated for this consumer.";

/** Whether the durable-intake submit action is activated for this consumer. */
export function intakeSubmitActivated(): boolean {
  return isMountedGenerationOperation("workspace.generation.intake");
}

export function planIntake(args: {
  /** From `intakeSubmitActivated()`; the dispatch guard checks it again. */
  activated: boolean;
  capability: { enabled: boolean };
  body: IntakeBody;
  actor: IntakeActor;
  retained?: IntakeRecoveryRecord | null;
}): GenerationPlan {
  if (!args.activated) return withheld(intakeNotActivated);
  if (!args.capability.enabled)
    return refusal("Two-step drafting is not enabled for this workspace.");
  if (noIntakeSource(args.body))
    return refusal("Supply at least one source before submitting an intake.");
  const parsed = intakeBody.safeParse(args.body);
  if (!parsed.success) return refusal(invalid(parsed));
  const decision = reviewIntakeRecovery(args.retained ?? null, {
    body: parsed.data,
    actor: args.actor,
  });
  if (decision.kind === "replay")
    return { kind: "replay", entry: decision.record };
  if (decision.kind === "retire") return refusal(decision.reason);
  // `send` builds a new request; `check` re-sends the retained EXACT request
  // (same body, same derived key), which the endpoint replays by that key
  // instead of running twice. Both are a real request, so the caller still has
  // to choose to send it: a check is never issued automatically.
  const attempt =
    decision.kind === "check"
      ? {
          body: decision.record.body,
          key: decision.record.key,
          digest: decision.record.digest,
        }
      : decision;
  return {
    kind: "request",
    operation: "workspace.generation.intake",
    input: { body: attempt.body, idempotencyKey: attempt.key },
    retain: { key: attempt.key, digest: attempt.digest },
  };
}

/**
 * The explicit check of a retained attempt's EXACT request, built from the
 * retained record alone and never from the form the operator has since edited.
 * An edited form therefore cannot hide this control or change what it would
 * send: the same body, the same derived key, and so the same run the endpoint
 * replays. It is a `replay` reading, not a request, once the attempt has a
 * confirmed receipt.
 */
export function intakeRetainedCheck(args: {
  activated: boolean;
  capability: { enabled: boolean };
  actor: IntakeActor;
  retained: IntakeRecoveryRecord | null;
}): GenerationPlan | null {
  if (!args.retained) return null;
  return planIntake({
    activated: args.activated,
    capability: args.capability,
    body: args.retained.body,
    actor: args.actor,
    retained: args.retained,
  });
}

/**
 * Whether the check is the control to offer beside the current plan: a retained
 * attempt's own request is a real request, while the current form no longer
 * plans that same request. A form that still plans it is already the check, and
 * a confirmed attempt is a replay reading instead.
 */
export function intakeCheckOffered(
  current: GenerationPlan | null,
  check: GenerationPlan | null,
): boolean {
  return (
    current !== null && current.kind !== "request" && check?.kind === "request"
  );
}

/** An intake with no source at all is not a request the endpoint would accept. */
function noIntakeSource(body: IntakeBody): boolean {
  return (
    body.factualAttachmentIds.length === 0 &&
    body.sampleAttachmentIds.length === 0 &&
    body.priorWorkspaceDraftIds.length === 0 &&
    !body.pastedContext &&
    !body.pastedSample
  );
}

/** The recovery scope of the acting identity, as the recovery leaf derives it. */
export function intakeScopeOf(actor: IntakeActor): string {
  return intakeRecoveryScope(actor);
}

/**
 * A retained attempt only counts for the identity that started it: a record
 * retained under another scope is ignored, so a stale record from a different
 * tenant or user can never suppress or replay this caller's submit. The scope is
 * that acting user identity (tenant + user + clerkUserId), not a browser session
 * id - which is what makes the same attempt recoverable after a reload.
 */
export function intakeRetainedFor(
  scope: string,
  retained: { scope: string; record: IntakeRecoveryRecord } | null,
): IntakeRecoveryRecord | null {
  return retained && retained.scope === scope ? retained.record : null;
}

/** A run's current status, read for this surface only through its own schema. */
export type IntakeRunView = {
  runId: string;
  status: string;
  stage: string;
  stages: Array<{ name: string; status: string; detail?: string }>;
  sections: Array<{ name: string; status: string; error?: string }>;
  errorMessage?: string;
};

/** Resolved run statuses: the durable worker never leaves one of these. */
const resolvedRunStatuses = ["complete", "partial", "failed", "cancelled"];

export function intakeRunResolved(status: string): boolean {
  return resolvedRunStatuses.includes(status);
}

/**
 * A retained attempt may be settled only once the run it started has actually
 * resolved, and only through that attempt's own run read: a live run, a missing
 * receipt or a run read for anything else keeps the attempt - and the run's
 * outcome reason - in view.
 */
export function intakeDismissable(
  record: IntakeRecoveryRecord | null,
  run: IntakeRunView | undefined,
): boolean {
  return Boolean(
    record?.receipt &&
      run &&
      run.runId === record.receipt.runId &&
      intakeRunResolved(run.status),
  );
}

export function intakeRunView(
  run: GenerationRunStatus | undefined,
): IntakeRunView | undefined {
  if (!run) return undefined;
  return {
    runId: run.runId,
    status: run.status,
    stage: run.stage,
    stages: run.stages.map((stage) => ({
      name: stage.name,
      status: stage.status,
      ...(stage.detail ? { detail: stage.detail } : {}),
    })),
    sections: Object.entries(run.sectionStates).map(([name, section]) => ({
      name,
      status: section.status,
      ...(section.error ? { error: section.error } : {}),
    })),
    ...(run.errorMessage ? { errorMessage: run.errorMessage } : {}),
  };
}

/**
 * The explicit reading of a run's current status. Cancelled and failed runs are
 * reported as such (never as "still working"), and a resolved run reports the
 * sections the draft now holds.
 */
export function intakeRunNotice(view: IntakeRunView | undefined): string {
  if (!view) return "";
  if (view.status === "cancelled")
    return `Run ${view.runId} was cancelled, so no further sections will be drafted.`;
  if (view.status === "failed")
    return `Run ${view.runId} failed: ${view.errorMessage ?? "no reason was reported by the run"}.`;
  if (intakeRunResolved(view.status))
    return `Run ${view.runId} is ${view.status} with ${view.sections.length} section(s) on the draft.`;
  return `Run ${view.runId} is ${view.status} at stage ${view.stage}.`;
}
