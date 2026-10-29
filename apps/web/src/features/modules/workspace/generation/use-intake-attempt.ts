"use client";

// The journal-backed intake attempt: the identity the canonical request journal
// retains for one acting scope, the receipt that identity produced, and the three
// commands that may act on it - submit (a new request, or a repeat of an
// unconfirmed one), continue (resuming the run that receipt named through its own
// retained request, never by re-issuing it) and dismiss (settling an attempt whose
// run has resolved).
//
// The storage owner is the existing canonical journal
// (`shared/session/recovery/journal`) and the existing hydration hook
// (`useRetainedIntent`): this file adds no store, no queue and no second submit
// path. The attempt is reserved BEFORE the request leaves, so a reload or a lost
// answer finds the same derived key and the same exact body instead of minting a
// new identity; repeating that exact request is what the endpoint replays, and
// it cannot start a second run from the same key.
//
// The credential is not a concern here either: the request goes through the
// canonical Capiro client (`shared/capiro/gateway.ts`), which attaches the
// current session bearer server-side and turns the derived key into the
// `Idempotency-Key` header. This file never builds an auth header.
import {
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { CapiroApiError } from "../../../../shared/capiro/http";
import {
  generationRunStatus,
  intakeBody,
  intakeResponse,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import {
  acknowledgeRecovery,
  readRecovery,
  RecoveryStorageError,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
} from "../../../../shared/session/recovery/journal";
import { useRetainedIntent } from "../../../../shared/session/recovery/useRetainedIntent";
import type { GenerationPlan } from "./controller";
import {
  intakeRecoveryContract,
  intakeRetainedRecord,
  sameIntakeRequest,
  type IntakeActor,
  type IntakeRecoveryRecord,
} from "./intake-recovery";
import { intakeRunResolved, intakeScopeOf, type IntakeRunView } from "./intake";
import { runRetryNotice, runRetryOutcome } from "./run-retry";
import type { GenerationDispatchOutcome } from "./use-generation-panel";
import { useIntakeRun } from "./use-intake-run";

type IntakeServer = {
  request: (
    operation: string,
    input: unknown,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>;
};

/** What the canonical hydration hook hands back, as this file uses it. */
type IntakeJournal = {
  ready: boolean;
  error: string | undefined;
  record: IntakeRecoveryRecord | null;
  retry: () => void;
  guard: () => void;
  signal: () => AbortSignal;
  install: (record: IntakeRecoveryRecord | null) => void;
  block: (cause: unknown) => void;
};

type IntakeRuntime = { busy: boolean; hold: string; message: string };

type IntakeContext = {
  server: IntakeServer;
  scope: string;
  journal: IntakeJournal;
  working: { current: boolean };
  setRuntime: Dispatch<SetStateAction<IntakeRuntime>>;
  // The caller hands its own lifetime check to a dispatch, so the panel's release
  // publishes this attempt's notice/failure/reload only while it is still current.
  dispatch: (
    plan: GenerationPlan,
    label: string,
    guard?: () => void,
  ) => Promise<GenerationDispatchOutcome>;
  /** Re-read the run this attempt's receipt names, through its own read. */
  readRun: () => void;
  settle: () => void;
};

export type IntakeAttemptState = {
  ready: boolean;
  record: IntakeRecoveryRecord | null;
  busy: boolean;
  hold: string;
  message: string;
  error: string | undefined;
  retry: () => void;
  submit: (plan: GenerationPlan) => Promise<void>;
  /** Resume the run this attempt's receipt named; the plan names no other run. */
  continueRun: (plan: GenerationPlan) => Promise<void>;
  dismiss: () => Promise<void>;
  /** The run this attempt's own receipt names, as this surface reads it. */
  run: IntakeRunView | undefined;
  runError: Error | undefined;
};

/** The current session identity, as the existing canonical `me.read` reports it. */
type SessionIdentity = {
  tenant: { id: string };
  user: { id: string; clerkUserId: string };
};

/** The panel is acting as an identity the current session no longer confirms. */
export class IntakeScopeError extends Error {
  constructor() {
    super(
      "This intake no longer matches the current account or session. Reopen Workspace before submitting it again.",
    );
    this.name = "IntakeScopeError";
  }
}

/** Verify the current session still is the identity this attempt was keyed on. */
async function confirmIntakeAuthority(
  server: IntakeServer,
  actor: IntakeActor | undefined,
  signal: AbortSignal,
  guard: () => void,
): Promise<void> {
  if (!actor) throw new IntakeScopeError();
  const me = (await server.request("me.read", {}, { signal })) as
    | SessionIdentity
    | undefined;
  guard();
  if (
    !me ||
    me.tenant.id !== actor.tenantId ||
    me.user.id !== actor.userId ||
    me.user.clerkUserId !== actor.clerkUserId
  )
    throw new IntakeScopeError();
}

/** Map one failed command onto the canonical block/hold semantics. */
function releaseIntakeCommand(context: IntakeContext, cause: unknown): void {
  if (cause instanceof DOMException && cause.name === "AbortError") return;
  try {
    context.journal.guard();
  } catch {
    return;
  }
  if (
    cause instanceof IntakeScopeError ||
    cause instanceof RecoveryStorageError ||
    (cause instanceof CapiroApiError && [401, 403, 404].includes(cause.status))
  )
    context.journal.block(cause);
  context.setRuntime((current) => ({
    ...current,
    hold: cause instanceof Error ? cause.message : "The intake is not confirmed.",
  }));
}

/** One command, serialized on the journal's own command lock. */
async function intakeCommand<Result>(
  context: IntakeContext,
  send: () => Promise<Result>,
): Promise<Result | undefined> {
  if (context.working.current || !context.journal.ready) return undefined;
  context.working.current = true;
  // Each command reports its own result: a previous command's message is cleared
  // here rather than shown beside this one.
  context.setRuntime((current) => ({
    ...current,
    busy: true,
    hold: "",
    message: "",
  }));
  try {
    return await withRecoveryCommandLock(context.scope, context.journal.guard, send);
  } catch (cause) {
    releaseIntakeCommand(context, cause);
    return undefined;
  } finally {
    context.working.current = false;
    try {
      context.journal.guard();
      context.setRuntime((current) => ({ ...current, busy: false }));
    } catch {
      /* The scope was disposed. */
    }
  }
}

/** One send of an attempt's exact request, retaining the receipt it returns. */
async function deliverIntake(
  context: IntakeContext,
  plan: GenerationPlan,
  attempt: IntakeRecoveryRecord,
): Promise<void> {
  // The dispatch publishes its notice/failure/reload for a resolved request, so
  // it is handed THIS attempt's own lifetime check: a reply that lands after the
  // scope was replaced publishes nothing into the scope that replaced it.
  const outcome = await context.dispatch(plan, "Intake", context.journal.guard);
  if (outcome.kind !== "applied") return;
  // Read the response through the intake operation's own closed schema: a
  // response that does not parse stays unconfirmed and is never a receipt.
  const receipt = intakeResponse.safeParse(outcome.result);
  if (!receipt.success) return;
  const confirmed = intakeRetainedRecord(attempt, receipt.data);
  await updateRecovery(
    context.scope,
    attempt.fence,
    confirmed,
    intakeRecoveryContract,
    context.journal.guard,
  );
  context.journal.install(confirmed);
}

async function submitIntake(
  context: IntakeContext,
  planned: GenerationPlan,
): Promise<void> {
  if (planned.kind !== "request" || !planned.retain) return;
  const key = planned.retain.key;
  const digest = planned.retain.digest;
  const body = intakeBody.parse(planned.input.body);
  await intakeCommand(context, async () => {
    const existing = await readRecovery(
      context.scope,
      intakeRecoveryContract,
      context.journal.guard,
    );
    if (existing) {
      // A retained attempt owns the identity of this exact request: no second
      // submit beside it, and no different request riding on its key.
      if (!sameIntakeRequest(existing, { key, digest, body }))
        throw new RecoveryStorageError();
      context.journal.install(existing);
      return deliverIntake(context, planned, existing);
    }
    const attempt: IntakeRecoveryRecord = {
      fence: crypto.randomUUID(),
      key,
      digest,
      body,
    };
    const reserved = await reserveRecovery(
      context.scope,
      attempt.fence,
      attempt,
      intakeRecoveryContract,
      context.journal.guard,
    );
    if (!sameIntakeRequest(reserved, attempt)) throw new RecoveryStorageError();
    context.journal.install(reserved);
    return deliverIntake(context, planned, reserved);
  });
}

/** The run status a resolved run reports, or nothing while it is still live. */
function runResolved(read: unknown): boolean {
  const status = generationRunStatus.safeParse(read);
  return status.success && intakeRunResolved(status.data.status);
}

async function dismissIntake(
  context: IntakeContext,
  attempt: IntakeRecoveryRecord | null,
): Promise<void> {
  if (!attempt?.receipt) return;
  await intakeCommand(context, async () => {
    // Re-read the attempt and its run under the command lock: only a run that
    // still reads resolved settles it, and only that attempt is retired.
    const current = await readRecovery(
      context.scope,
      intakeRecoveryContract,
      context.journal.guard,
    );
    if (!current || !sameIntakeRequest(current, attempt) || !current.receipt)
      throw new RecoveryStorageError();
    const read = await context.server.request(
      "workspace.generation.run.status",
      { params: { runId: current.receipt.runId } },
      { signal: context.journal.signal() },
    );
    if (!runResolved(read))
      throw new Error(
        "The run has not resolved yet, so this attempt is still live and stays retained.",
      );
    context.journal.guard();
    await acknowledgeRecovery(context.scope, current.fence, context.journal.guard);
    context.journal.install(null);
    context.setRuntime((state) => ({
      ...state,
      message: `Run ${current.receipt!.runId} is settled, so this attempt is dismissed.`,
    }));
    context.settle();
  });
}

/**
 * The explicit continuation of the run this attempt's confirmed receipt named.
 * The plan is built from that receipt alone, so no other run can be named here;
 * the reply is correlated with that run before anything is reported, and the run
 * is then read for its current status. Nothing is re-issued: the request the
 * route answers is the run's own retained native request, and a refused, revoked
 * or uncertain answer leaves the attempt exactly as it is.
 *
 * Exported for its focused witness (`intake-run-continuation.test.ts`), which
 * drives this exact function with the journal's real lifetime semantics: the
 * disposal behaviour below is only observable if the real command runs.
 */
export async function continueIntakeRun(
  context: IntakeContext,
  planned: GenerationPlan,
): Promise<void> {
  if (planned.kind !== "request") return;
  const runId = planned.input.params?.runId;
  if (typeof runId !== "string" || runId === "") return;
  await intakeCommand(context, async () => {
    const current = await readRecovery(
      context.scope,
      intakeRecoveryContract,
      context.journal.guard,
    );
    if (!current?.receipt || current.receipt.runId !== runId)
      throw new RecoveryStorageError();
    context.journal.install(current);
    const outcome = await context.dispatch(
      planned,
      "Run continuation",
      context.journal.guard,
    );
    // The send is awaited, so the scope can be disposed (another account, another
    // document, a re-hydration) while this reply is in flight. Publishing after
    // that point would show THIS attempt's outcome inside the scope that replaced
    // it — on a component that is still mounted. The dispatch was handed this
    // attempt's own lifetime check, so its notice/failure/reload publish nothing
    // once the scope is replaced; the release below guards the publishes that
    // belong to THIS seam, which the command lock alone would check too late.
    context.journal.guard();
    // Read the SAME run again for its current status. The reply is not the run's
    // state, and a reply that named another run has already left this one alone.
    context.readRun();
    if (outcome.kind !== "applied") return;
    const reply = runRetryOutcome(outcome.result, runId);
    context.setRuntime((state) => ({
      ...state,
      message: runRetryNotice(reply),
    }));
  });
}

export function useIntakeAttempt(args: {
  actor: IntakeActor | undefined;
  dispatch: (
    plan: GenerationPlan,
    label: string,
    guard?: () => void,
  ) => Promise<GenerationDispatchOutcome>;
  onSettled: () => void;
}): IntakeAttemptState {
  const server = useCapiro() as unknown as IntakeServer;
  const actor = args.actor;
  const scope = actor ? intakeScopeOf(actor) : "";
  const journal = useRetainedIntent(scope, intakeRecoveryContract, (signal, guard) =>
    confirmIntakeAuthority(server, actor, signal, guard),
  );
  const [runtime, setRuntime] = useState<IntakeRuntime>({
    busy: false,
    hold: "",
    message: "",
  });
  const working = useRef(false);
  const record = journal.ready ? journal.record : null;
  const runRead = useIntakeRun(record, args.onSettled);
  const context: IntakeContext = {
    server,
    scope,
    journal,
    working,
    setRuntime,
    dispatch: args.dispatch,
    readRun: runRead.reload,
    settle: args.onSettled,
  };
  return {
    ready: journal.ready,
    record,
    busy: runtime.busy,
    hold: runtime.hold,
    message: runtime.message,
    error: journal.error,
    retry: journal.retry,
    submit: (plan) => submitIntake(context, plan),
    continueRun: (plan) => continueIntakeRun(context, plan),
    dismiss: () => dismissIntake(context, record),
    run: runRead.run,
    runError: runRead.error,
  };
}
