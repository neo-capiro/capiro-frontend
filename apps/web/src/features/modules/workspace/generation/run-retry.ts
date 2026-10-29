// WS-22 durable run-continuation leaf for the Workspace two-step draft owner
// (`quick-draft/two-step-draft.controller.ts`:
// POST /document-agent/runs/:runId/retry-failed).
//
// The route is served by the SAME approved owner as the intake and the run read.
// For a run a durable intake created, the worker re-reads/replays the SAME
// RETAINED native request with the caller's own current credential, so this is a
// continuation of one outcome - never a new request, a new request identity, a
// new paid turn or a status taken as authority. The receipt only correlates the
// surface with that run, so the control may only ever name the run the receipt
// already names.
//
// Three facts of the producer decide what may be offered here and what its
// answer may be said to mean; all three are read from the worker itself rather
// than assumed:
//   * its atomic claim accepts only a `queued` run or an `active` run whose lease
//     has expired, so a run that already resolved
//     (`complete`/`partial`/`failed`/`cancelled`) cannot be continued at all and
//     is reported as such instead of being promised a resume;
//   * without a current session credential a durable-intake run answers
//     `awaiting-current-access` and is left exactly as it is; and
//   * the route answers with the run's CURRENT status and never reports what the
//     reconciliation did: it awaits `reconcileRetainedNativeRequest` and
//     discards its boolean, which is itself false for a run with nothing
//     retained, for a current-access refusal and for a lease another worker
//     still holds. A `queued`/`active` answer therefore does NOT prove that any
//     work resumed, and a terminal answer may equally follow a real resume. So
//     this leaf reports the correlated status and the disposition it leaves
//     pending, and claims no effect in either direction.
//
// Pure on purpose: the plan, the reply correlation and the wording are decided
// here and are testable in this repository's node environment. The command that
// sends one is `use-intake-attempt.ts`; the control is `IntakePanel.tsx`.
import { runRetryResponse } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { refusal, withheld, type GenerationPlan } from "./controller";
import { intakeRunResolved, type IntakeRunView } from "./intake";
import type { IntakeRecoveryRecord } from "./intake-recovery";
import { isMountedGenerationOperation } from "./owner-map";

/** Why a caller cannot build a run continuation, if it cannot. */
const runRetryNotActivated =
  "Continuing a durable run is not activated for this consumer.";

/**
 * The route's one accepted workflow marker (Core: `NATIVE_RETAINED_RETRY_WORKFLOW`
 * in `quick-draft/dto/intake.dto.ts`, and this operation's own request schema
 * pins it as a literal). It selects the native workflow and nothing else, so this
 * surface can never ask the route for a different one.
 */
const NATIVE_RETRY_WORKFLOW = "native-retained" as const;

/**
 * Core's closed paid-generation acknowledgement (`RETRY_FAILED_UNITS_INTENT` in
 * `quick-draft/dto/intake.dto.ts`). It is sent by ONE control only: the
 * deliberate retry of the units this run actually failed. Without it the route
 * binds no retry attempt and issues no native turn, so a check/re-read can never
 * turn into new paid generation.
 */
const RETRY_FAILED_UNITS_INTENT = "retry-failed-units" as const;

/**
 * What the caller's own control is asking for. `recover` re-reads/replays the
 * run's RETAINED request and asks for no new generation; `retry-failed-units` is
 * the deliberate paid act. The kind is never inferred from the run's status: a
 * run that merely LOOKS retryable is only ever reported, because a status is not
 * a caller's acknowledgement.
 */
export type RunRetryKind = "recover" | "retry-failed-units";

/** A run the worker resolved on a definite failure: the only retryable state. */
const retryableRun = (status: string): boolean => status === "failed" || status === "partial";

/** Whether the run continuation is activated for this consumer. */
export function runRetryActivated(): boolean {
  return isMountedGenerationOperation("workspace.generation.run.retryFailed");
}

/**
 * The plan for continuing the run this surface's own confirmed receipt names.
 * Every reason below is a real state of this surface or of the producer, and the
 * run id can only come from that receipt: no arbitrary id, no legacy row and no
 * inferred run is ever named.
 */
export function planRunRetry(args: {
  /** From `runRetryActivated()`; the dispatch guard checks it again. */
  activated: boolean;
  capability: { enabled: boolean };
  record: IntakeRecoveryRecord | null;
  /** The run read of THIS surface; only the receipt's own run is accepted. */
  run: IntakeRunView | undefined;
  /** The control the caller is rendering; `recover` unless stated otherwise. */
  kind?: RunRetryKind;
}): GenerationPlan {
  if (!args.activated) return withheld(runRetryNotActivated);
  if (!args.capability.enabled)
    return refusal(
      "Two-step drafting is not enabled for this workspace, so there is no durable run here.",
    );
  const receipt = args.record?.receipt;
  if (!receipt)
    return refusal(
      "Only the run this surface submitted can be continued, and there is no receipt for a run here.",
    );
  if (!args.run || args.run.runId !== receipt.runId)
    return refusal(
      `Run ${receipt.runId} has not been read yet. Its current status is read first, so a continuation is never built from a run id alone.`,
    );
  if (args.kind === "retry-failed-units") {
    // The DELIBERATE paid act. It is offered for exactly the state the worker can
    // retry - a run that resolved on a definite failure - and its body carries the
    // caller's own acknowledgement, because this request may generate again for
    // the units the run's OWN per-unit state failed. The units are never named
    // here: the server derives them.
    if (!retryableRun(args.run.status))
      return refusal(
        `Run ${receipt.runId} is ${args.run.status}, so it has no failed unit to retry. Nothing that could generate again is sent for it.`,
      );
    return {
      kind: "request",
      operation: "workspace.generation.run.retryFailed",
      input: {
        params: { runId: receipt.runId },
        body: { workflow: NATIVE_RETRY_WORKFLOW, intent: RETRY_FAILED_UNITS_INTENT },
      },
    };
  }
  if (intakeRunResolved(args.run.status))
    return refusal(
      `Run ${receipt.runId} is already ${args.run.status}. Checking a run does not generate: a run the worker has resolved is retried only by the explicit retry of its failed units, which asks for new generation and is a separate, deliberate control.`,
    );
  return {
    kind: "request",
    operation: "workspace.generation.run.retryFailed",
    input: {
      params: { runId: receipt.runId },
      // The route's closed native-only discriminator, for the run THIS receipt
      // already names. It selects the native workflow, so a run the durable-intake
      // owner did not create is refused at the route instead of being handed to
      // the legacy owner - the local receipt cannot enforce that by itself. It is
      // a workflow selector only: no authority, no new identity. No `intent`: this
      // control checks/re-reads the retained request and never asks for new work.
      body: { workflow: NATIVE_RETRY_WORKFLOW },
    },
  };
}

/** What the route's own answer means for the run that was asked about. */
export type RunRetryOutcome =
  /**
   * The route reported this run as still live (`queued`/`active`). That is the
   * run's own status, not a report of what the reconciliation did: no effect is
   * claimed and the disposition stays pending.
   */
  | { kind: "pending"; runId: string; status: string }
  | { kind: "awaiting-current-access"; runId: string }
  /** The route reported a terminal status for this run. */
  | { kind: "resolved"; runId: string; status: string }
  | { kind: "other-run"; expected: string; reported: string }
  | { kind: "unconfirmed" };

/**
 * Correlate the reply with the run that was asked about, through the operation's
 * own closed schema. A reply that does not parse is `unconfirmed` (nothing is
 * claimed and nothing is sent again), and a reply for another run never updates
 * this one. The status carried back is the run's own current status - the route
 * reports nothing about whether the retained request was taken up - so the two
 * status cases below describe that status and no effect.
 */
export function runRetryOutcome(
  reply: unknown,
  runId: string,
): RunRetryOutcome {
  const parsed = runRetryResponse.safeParse(reply);
  if (!parsed.success) return { kind: "unconfirmed" };
  if (parsed.data.runId !== runId)
    return { kind: "other-run", expected: runId, reported: parsed.data.runId };
  if (parsed.data.status === "awaiting-current-access")
    return { kind: "awaiting-current-access", runId };
  if (intakeRunResolved(parsed.data.status))
    return { kind: "resolved", runId, status: parsed.data.status };
  return { kind: "pending", runId, status: parsed.data.status };
}

/** What the outcome is reported as, in the terms the producer actually reported. */
export function runRetryNotice(outcome: RunRetryOutcome): string {
  switch (outcome.kind) {
    case "other-run":
      return `The reply named run ${outcome.reported}, not run ${outcome.expected}: nothing was applied to this run and its own current status is read instead.`;
    case "awaiting-current-access":
      return `Run ${outcome.runId} was not continued: the route reports awaiting-current-access for it because that request carried no current session credential. The retained request is unchanged, so reading the run's status from a signed-in session is the next step.`;
    case "resolved":
      return `Run ${outcome.runId} is reported ${outcome.status} now. That is the status this route returned for the run; the route reports the run's own status rather than what a continuation did, so read the sections the draft holds for it.`;
    case "pending":
      return `Run ${outcome.runId} is reported ${outcome.status} now. The route answers with the run's own current status and does not report whether the retained request was taken up, so this continuation's disposition is pending: read the run again for its current status.`;
    default:
      return "The reply did not confirm this run, so nothing about it is claimed. Read its current status before acting again; no second request was sent.";
  }
}
