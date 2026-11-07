"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Button } from "@capiro/ui/button";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import { TabJournalUnavailable } from "../../../shared/meri-conversations/tab-journal";
import ui from "../ui/meri-ui.module.css";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import { UserMessage } from "../screens/conversation/UserMessage";
import { ConversationPanels } from "./ConversationPanels";
import { ConversationBody } from "./ConversationFrame";
import {
  useLiveComposer,
  type ConversationComposerChannel,
} from "./conversation-composer";
import { ConversationTurn } from "./ConversationTurn";
import { RunStatus } from "./RunStatus";
import {
  isTerminal,
  turnFromObservation,
  currentTurnView,
  type TurnView,
} from "./conversation-view";
import { useLiveRun } from "./useLiveRun";
import { settledRefreshDue } from "./saved-turns";
import { shouldShowPrompt } from "./prompt-identity";
import type { InitialDraftOwner } from "./initial-draft";
import styles from "./live.module.css";
import type { ConversationSkillSelection } from "../../../shared/meri-conversations/query-journal";
import {
  useRunLifecycle,
  type LifecycleTarget,
} from "./lifecycle/useRunLifecycle";
import {
  CheckpointActions,
  RunLifecycleControls,
} from "./lifecycle/RunLifecycleControls";
import { SelectedRequestReceipt } from "./SelectedRequestReceipt";
import { ConnectedBrowserViewer } from "../browser/ConnectedBrowserViewer";
import { DailyQuote } from "../quote/DailyQuote";
import { inputRefusedMessage } from "./control-reachability";
import { useBoundedCheck, useQueuedSend } from "./queued-send";
import { useReconnectSchedule } from "../../../shared/meri-conversations/reconnect-schedule";
import { ORIGINAL_INPUT_CLOSED } from "./skill-refusal";
import type { SendInNewConversation } from "./useSendInNewConversation";

/** The current admitted segment, or the exact immutable request whose ACK is still pending. */
function LiveTurn({
  turn,
  intent,
  earlier,
  controls,
  refused = false,
}: {
  turn: TurnView | null;
  intent: ReturnType<typeof useLiveRun>["intent"];
  earlier: readonly TurnView[];
  controls: ReactNode;
  /** The edge refused the retained message before Capiro saw it; it was not sent. */
  refused?: boolean;
}) {
  if (turn)
    return (
      <ConversationTurn
        turn={turn}
        label="Current turn"
        showPrompt={shouldShowPrompt(turn, earlier)}
        controls={controls}
      />
    );
  if (!intent.submit) return null;
  return (
    <article
      className={`${styles.turn} ${styles.pending}`}
      aria-label="Current turn"
    >
      <UserMessage>{intent.submit.prompt}</UserMessage>
      <p className={styles.muted}>
        {intent.submit.state === "unknown"
          ? refused
            ? inputRefusedMessage
            : "Delivery is uncertain. Retry sends exactly the same request; nothing is duplicated."
          : intent.submit.state === "observed"
            ? "Message accepted. Reload the transcript to check its current status."
            : "Sending to Meri."}
      </p>
    </article>
  );
}

/** Local composer availability; only the SDK/server may admit an original input or next turn. */
export function composerAvailability(
  run: ReturnType<typeof useLiveRun>,
  turn: TurnView | null,
  earlier: readonly TurnView[],
  initialPrompt: string | undefined,
  initialBlocked: string | undefined,
  newIntentBlocked: string | undefined,
  nextTurnBlocked: string | undefined,
  nextTurnVerified: boolean,
  pendingDraft: boolean,
  /** Control confirmed this reserved run admitted no message, or the person discarded it. */
  reservedOpen = false,
) {
  const { intent, busy } = run;
  const refused = run.failure === "refused";
  // The conversation's original input is closed to the first message (it expired, or belongs to another one):
  // sending it here again could only be refused, so it goes to a new conversation instead.
  const originalClosed =
    !turn && !earlier.length && run.refusal?.code === ORIGINAL_INPUT_CLOSED;
  const initial =
    !turn &&
    !intent.submit &&
    !initialPrompt &&
    !earlier.length &&
    !initialBlocked &&
    !reservedOpen &&
    !originalClosed;
  // Control refused the reserved next message outright (a typed skill refusal), or confirmed that
  // this reserved run admitted none: nothing was dispatched to it, so a changed message may be sent
  // to it as an ordinary request.
  const resend =
    !turn &&
    !intent.submit &&
    ((!!initialPrompt && !!run.refusal) || reservedOpen);
  const firstBlocked = originalClosed
    ? "This conversation can no longer start with a new message. Send it in a new conversation."
    : !turn && !intent.submit && !initial && !resend
      ? (initialBlocked ?? "Check your last message before sending another.")
      : undefined;
  const sendBlocked =
    newIntentBlocked ??
    firstBlocked ??
    (isTerminal(turn?.runState) ? nextTurnBlocked : undefined) ??
    (busy
      ? "Meri is still handling your last command."
      : intent.submit?.state === "unknown"
        ? refused
          ? inputRefusedMessage
          : "Delivery of your last request is uncertain. Retry it before sending another."
        : intent.submit && !turn
          ? intent.submit.state === "observed"
            ? "Reload the transcript to verify the current run."
            : "Your request is being sent."
          : // A finished run whose own message is still being confirmed takes no new one yet: Enter says
            // so instead of reaching a send that would do nothing.
            !initial && !resend && isTerminal(turn?.runState) && pendingDraft
            ? "Your last message is still being confirmed."
            : undefined);
  return {
    initial,
    resend,
    originalClosed,
    sendBlocked,
    readyForNext:
      nextTurnVerified &&
      isTerminal(turn?.runState) &&
      !sendBlocked &&
      !pendingDraft &&
      intent.submit?.state !== "pending" &&
      intent.cancel !== "pending" &&
      intent.cancel !== "unknown",
    stopBlocked:
      busy || intent.cancel === "pending"
        ? "Meri is handling your last command."
        : run.snapshot.status !== "ready" || !run.snapshot.observation
          ? "Verify the current run before requesting Stop."
          : undefined,
  };
}

/** Only an exact positive acknowledgement may consume an unchanged captured draft. */
function useDraftAcknowledgement(
  initialDraft: InitialDraftOwner,
  port: MeriConversationPort,
  submit: ReturnType<typeof useLiveRun>["intent"]["submit"],
  draft: string,
  onDraft: (value: string) => void,
) {
  useEffect(() => {
    // Only a positively observed submit can consume the text that was sent. A late ACK must
    // leave newer edits alone, including edits made while this session was disconnected.
    try {
      if (initialDraft.acknowledge(port.context, submit, draft)) onDraft("");
    } catch {
      initialDraft.fail();
    }
  }, [initialDraft, port.context, submit, draft, onDraft]);
}

/**
 * A capture whose run already finished can never be acknowledged by a later send; left in place it made every later
 * Enter in this run do nothing (and clear the box). The run's admitted request settles it: delivered, or never
 * admitted (released, so the text stays the person's). Only once nothing is in flight for this run.
 */
function useTerminalCaptureSettlement(
  initialDraft: InitialDraftOwner,
  port: MeriConversationPort,
  finished: boolean,
  submit: ReturnType<typeof useLiveRun>["intent"]["submit"],
  admittedRequestId: string | undefined,
  onDraft: (value: string) => void,
) {
  useEffect(() => {
    if (
      !finished ||
      !admittedRequestId ||
      submit?.state === "pending" ||
      submit?.state === "unknown" ||
      !initialDraft.hasPending(port.context)
    )
      return;
    try {
      if (initialDraft.settleTerminal(port.context, admittedRequestId))
        onDraft("");
    } catch {
      initialDraft.fail();
    }
  }, [
    initialDraft,
    port.context,
    finished,
    submit,
    admittedRequestId,
    onDraft,
  ]);
}

/**
 * A definitive refusal released the retained request, or control confirmed this reserved run admitted
 * nothing (or the person discarded its message): a request still retained for it is dropped, and the
 * captured text goes back to the box so the person can change it and send again.
 */
function useRefusalRelease(
  initialDraft: InitialDraftOwner,
  port: MeriConversationPort,
  run: ReturnType<typeof useLiveRun>,
  reservedOpen: boolean,
) {
  const { release } = run;
  const retained =
    reservedOpen &&
    run.intent.submit?.state === "unknown" &&
    !run.busy &&
    run.snapshot.submit !== "pending" &&
    run.snapshot.submit !== "unknown";
  const released = (!!run.refusal || reservedOpen) && !run.intent.submit;
  // Once per mounted run: a release that fails leaves its storage error, never a retry loop.
  const releasing = useRef(false);
  useEffect(() => {
    if (!retained || releasing.current) return;
    releasing.current = true;
    void release();
  }, [retained, release]);
  useEffect(() => {
    if (released) initialDraft.release(port.context);
  }, [released, initialDraft, port.context]);
}

/** Refresh saved history once this mounted run reaches a terminal state the saved read does not show yet. */
function useSettledRefresh(finished: boolean, onSettled: () => void) {
  const announced = useRef(false);
  useEffect(() => {
    if (finished && !announced.current) {
      announced.current = true;
      onSettled();
    }
  }, [finished, onSettled]);
}

/** Tab return reads current status; paired focus/visibility events never start a polling loop. */
function useExternalRunRefresh(
  port: MeriConversationPort,
  run: ReturnType<typeof useLiveRun>,
  lifecycleBlocked: boolean,
) {
  const { busy, observing, refreshRunStatus, intent } = run;
  const cancelIntent = intent.cancel;
  const lastRefresh = useRef(-Infinity);
  useEffect(() => {
    const returned = () => {
      const snapshot = port.getSnapshot();
      const state = snapshot.observation?.runState;
      if (
        document.visibilityState !== "visible" ||
        lifecycleBlocked ||
        busy ||
        snapshot.status === "disposed" ||
        snapshot.status === "loading" ||
        snapshot.cancel !== "idle" ||
        cancelIntent ||
        isTerminal(state) ||
        observing === "live" ||
        observing === "reconnecting" ||
        !(
          state === "paused" ||
          state === "waiting-for-approval" ||
          snapshot.status === "unavailable" ||
          observing === "stalled"
        )
      )
        return;
      const now = Date.now();
      if (now - lastRefresh.current < 30_000) return;
      lastRefresh.current = now;
      refreshRunStatus();
    };
    window.addEventListener("focus", returned);
    document.addEventListener("visibilitychange", returned);
    return () => {
      window.removeEventListener("focus", returned);
      document.removeEventListener("visibilitychange", returned);
    };
  }, [port, refreshRunStatus, busy, observing, cancelIntent, lifecycleBlocked]);
}

/** One explicit move of the unsent first message to a new conversation; a failure says so and may be tried again. */
function SendInNewConversationButton({
  send,
}: {
  send: (signal: AbortSignal) => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const inflight = useRef<AbortController | null>(null);
  useEffect(() => () => inflight.current?.abort(), []);
  return (
    <div className={styles.statusRow}>
      <Button
        type="button"
        variant="outline"
        className={ui.outline}
        disabled={state === "busy"}
        onClick={() => {
          const controller = new AbortController();
          inflight.current = controller;
          setState("busy");
          send(controller.signal).catch(() => {
            if (!controller.signal.aborted) setState("failed");
          });
        }}
      >
        Send in a new conversation
      </Button>
      {state === "failed" && (
        <p role="alert" className={styles.muted}>
          A new conversation could not be opened. Your text is still here; try
          again.
        </p>
      )}
    </div>
  );
}

/**
 * Storage uncertainty disables mutation controls while the transcript remains readable. A
 * transcript read that control did not answer is read again on a backed-off schedule owned here,
 * so the schedule outlives the notice that comes and goes with each attempt.
 */
function CurrentRunStatus({
  run,
  retentionError,
  active,
  acceptedRequest,
  onDiscardUnrecoverable,
  onDiscardUncertain,
  onSendInNewConversation,
}: {
  run: ReturnType<typeof useLiveRun>;
  retentionError: string | undefined;
  active: boolean;
  acceptedRequest: ConversationStoredRequest | undefined;
  onDiscardUnrecoverable?: (() => void) | undefined;
  onDiscardUncertain?: (() => void) | undefined;
  onSendInNewConversation?:
    | ((signal: AbortSignal) => Promise<void>)
    | undefined;
}) {
  const reconnect = useReconnectSchedule(
    run.transcript === "unavailable" && run.failure === "unreachable"
      ? "failing"
      : run.transcript === "loading" || run.busy
        ? "busy"
        : "ok",
    run.history,
  );
  return (
    <>
      {retentionError && (
        <p role="alert" className={styles.muted}>
          {retentionError}
        </p>
      )}
      {/* Whatever this tab could not save or recover, the person can always give it up and write anew. */}
      {retentionError === new TabJournalUnavailable().message &&
        onDiscardUnrecoverable && (
          <>
            {/* Discarding forgets only this tab's copy: a message or Stop already sent may still take effect. */}
            <p className={styles.muted}>
              If your last message already reached Meri, it may still be
              answered.
            </p>
            <Button
              type="button"
              variant="outline"
              className={ui.outline}
              onClick={onDiscardUnrecoverable}
            >
              Discard and write a new message
            </Button>
          </>
        )}
      <RunStatus
        run={{ ...run, busy: run.busy || !!retentionError }}
        active={active}
        acceptedRequest={acceptedRequest}
        onRetry={reconnect.reset}
        onDiscardUncertain={onDiscardUncertain}
      />
      {onSendInNewConversation && (
        <SendInNewConversationButton send={onSendInNewConversation} />
      )}
    </>
  );
}

/**
 * A finished run or a newly opened empty conversation needs no announcement: the composer is
 * already open. If nothing else holds focus, the cursor goes to it so a message can be typed at once.
 */
function useComposerReturn(
  ready: boolean,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  useEffect(() => {
    if (!ready) return;
    const focused = document.activeElement;
    if (focused && focused !== document.body) return;
    textareaRef.current?.focus({ preventScroll: true });
  }, [ready, textareaRef]);
}

/** The session-bound run, with every turn already shown in this page above it. */
export function MeriLiveConversation({
  port,
  initialPrompt,
  earlier,
  scope,
  draft,
  onDraft,
  initialDraft,
  textareaRef,
  onNextTurn,
  nextTurnBlocked,
  nextTurnChecking = false,
  nextTurnVerified = false,
  initialBlocked,
  composer,
  promptKey,
  onSettled,
  savedCurrent,
  acceptedRequest,
  storageError,
  onDiscardUnrecoverable,
  onSendInNewConversation,
  modelSelection,
  modelBlocked,
  skillSelection,
  newIntentBlocked,
  onLifecycleTarget,
  onBrowserTarget,
  historyUnavailable = false,
  reservedOpen = false,
  reservedEmpty = false,
}: {
  port: MeriConversationPort;
  initialPrompt: string | undefined;
  earlier: readonly TurnView[];
  scope: string;
  draft: string;
  onDraft: (value: string) => void;
  initialDraft: InitialDraftOwner;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** The run finished: send `prompt` as the conversation's next run. */
  onNextTurn: (prompt: string, finished: TurnView) => boolean;
  nextTurnBlocked?: string | undefined;
  /** The latest-run check is still in flight: a message typed now waits for it instead of being refused. */
  nextTurnChecking?: boolean | undefined;
  /** Current exact-run history is re-verified and permits a client-side next-turn attempt. */
  nextTurnVerified?: boolean | undefined;
  initialBlocked?: string | undefined;
  /** A new first submission or next turn would carry a skill the current rollout does not admit. */
  newIntentBlocked?: string | undefined;
  composer: ConversationComposerChannel;
  promptKey?: string | undefined;
  onSettled: () => void;
  savedCurrent?: TurnView | undefined;
  acceptedRequest?: ConversationStoredRequest | undefined;
  storageError?: string | undefined;
  /** Give up a message this tab could not save or recover, so a new one can be sent. */
  onDiscardUnrecoverable?: (() => void) | undefined;
  /** Moves an unsent first message this conversation can no longer take to a new conversation. */
  onSendInNewConversation?: SendInNewConversation | undefined;
  modelSelection?: ConversationStoredRequest["modelSelection"];
  modelBlocked?: string | undefined;
  skillSelection?: ConversationSkillSelection;
  onLifecycleTarget: (target: LifecycleTarget) => void;
  /** Opens a browser resume/observation target from this run; lifecycle routing is the default. */
  onBrowserTarget?: ((target: LifecycleTarget) => void) | undefined;
  /** The saved-history read failed: an empty-looking hero must not stand in for that failure. */
  historyUnavailable?: boolean;
  /** This reserved run admitted no message (control's answer, or the person discarded it). */
  reservedOpen?: boolean;
  /** A current empty read permits a new message only when this run has no retained request. */
  reservedEmpty?: boolean;
}) {
  const run = useLiveRun(
    port,
    initialPrompt,
    savedCurrent?.runId === port.context.runId ? acceptedRequest : undefined,
  );
  const { snapshot, intent } = run;
  // A replacement credential rereads this same keyed run; keep its admitted display while it loads.
  const [retainedObservation, setRetainedObservation] = useState(
    snapshot.observation,
  );
  if (snapshot.observation && retainedObservation !== snapshot.observation)
    setRetainedObservation(snapshot.observation);
  const displayedObservation = snapshot.observation ?? retainedObservation;
  const lifecycle = useRunLifecycle(
    port,
    run.suspendObservation,
    run.reconnect,
    onLifecycleTarget,
  );
  useExternalRunRefresh(port, run, lifecycle.busy || !!lifecycle.command);
  // The applied request is the admitted one: its model selection labels the answer, and a website
  // task in it mounts the browser controls. The composer's pending selection is not a run.
  const applied = snapshot.acceptedRequest ?? acceptedRequest;
  const observed = displayedObservation
    ? {
        ...turnFromObservation(displayedObservation, port.context.runId),
        ...(promptKey ? { promptKey } : {}),
        ...(applied?.modelSelection
          ? { modelSelection: applied.modelSelection }
          : {}),
      }
    : null;
  const turn = currentTurnView(observed, savedCurrent);
  const finished = isTerminal(turn?.runState);
  const active = !!turn && !finished;
  // Browser controls belong to a run that used the browser: an admitted receipt, or this run's
  // applied request naming a website task. Once mounted for a run they stay mounted for that run,
  // so a live session is never recreated.
  const [browserRunId, setBrowserRunId] = useState<string>();
  if (
    browserRunId !== port.context.runId &&
    ((turn?.browserReceipts.length ?? 0) > 0 || !!applied?.siteWorkflow)
  )
    setBrowserRunId(port.context.runId);
  useDraftAcknowledgement(initialDraft, port, intent.submit, draft, onDraft);
  useTerminalCaptureSettlement(
    initialDraft,
    port,
    finished,
    intent.submit,
    applied?.requestId,
    onDraft,
  );
  useRefusalRelease(initialDraft, port, run, reservedOpen);
  useSettledRefresh(settledRefreshDue(turn, savedCurrent), onSettled);
  const availability = composerAvailability(
    run,
    turn,
    earlier,
    initialPrompt,
    initialBlocked,
    newIntentBlocked,
    nextTurnBlocked,
    nextTurnVerified,
    initialDraft.hasPending(port.context),
    reservedOpen || reservedEmpty,
  );
  const retentionError =
    storageError ?? initialDraft.error() ?? run.storageError;
  useComposerReturn(
    (availability.readyForNext ||
      (availability.initial && !availability.sendBlocked)) &&
      !retentionError &&
      !lifecycle.blocked,
    textareaRef,
  );
  const controlsHeld =
    run.busy ||
    !!retentionError ||
    snapshot.status !== "ready" ||
    intent.submit?.state === "unknown" ||
    intent.cancel === "unknown";
  const checkpointId =
    lifecycle.receipt?.checkpointId ?? turn?.checkpointIds.at(-1);
  // The rollout refusal closes Send but must never lock the selection controls, otherwise an applied
  // unsent quick action could not be cleared or switched. Recompute the same availability without it
  // (no string comparison): whatever still blocks is a genuine run/storage/access/pending lock.
  const selectionLocked =
    retentionError ??
    lifecycle.blocked ??
    modelBlocked ??
    (newIntentBlocked
      ? composerAvailability(
          run,
          turn,
          earlier,
          initialPrompt,
          initialBlocked,
          undefined,
          nextTurnBlocked,
          nextTurnVerified,
          initialDraft.hasPending(port.context),
          reservedOpen || reservedEmpty,
        ).sendBlocked
      : availability.sendBlocked);
  /** Sends the draft; false when nothing was sent, so a caller handing a waiting message over can say so. */
  const send = () => {
    if (retentionError || modelBlocked || lifecycle.blocked) return false;
    // A new intent carrying a skill the current rollout does not admit is refused here, before the
    // first request or next-turn reservation is recorded. The selection itself is left intact.
    if (newIntentBlocked) return false;
    const prompt = draft.trim();
    if (!prompt) return false;
    if (availability.initial) {
      void run.submitInitial(
        prompt,
        (request) => initialDraft.begin(port.context, request, draft),
        modelSelection,
        skillSelection,
      );
      return true;
    } else if (availability.resend) {
      void run.submit(
        prompt,
        false,
        (request) => initialDraft.begin(port.context, request, draft),
        modelSelection,
        skillSelection,
      );
      return true;
    } else if (
      !initialDraft.hasPending(port.context) &&
      turn &&
      finished &&
      !nextTurnBlocked
    )
      return onNextTurn(prompt, turn);
    return false;
  };
  // One pending message: while a run is in flight for the last message and nothing else blocks, the draft
  // waits in the box as the queued message and is sent once the run finishes. A block other than the run,
  // a block that remains once the run ended (for example a refused skill or a next-turn refusal) or an
  // emptied box releases it, keeping the text and showing why.
  // The latest-run check of a fresh or reloaded thread counts too: a first Enter waits for it (X15).
  // A message waits on the conversation check only for a bounded time; then the check's own refusal shows.
  // The check counts only once no run is active: a run in flight has no terminal source yet, and its own
  // length must not use up the wait.
  const checking = useBoundedCheck(nextTurnChecking && !active);
  const waiting =
    active ||
    checking ||
    (!!intent.submit && intent.submit.state !== "unknown" && !turn);
  const blocking =
    retentionError ??
    lifecycle.blocked ??
    modelBlocked ??
    newIntentBlocked ??
    (intent.submit?.state === "unknown" || availability.resend
      ? (availability.sendBlocked ?? "")
      : !waiting && !run.busy
        ? availability.sendBlocked
        : undefined);
  const queue = useQueuedSend(
    waiting,
    blocking === undefined &&
      (availability.readyForNext ||
        (availability.initial && !availability.sendBlocked)),
    // Only text typed since the last capture may be queued: a captured attempt is already in the
    // transcript and its box is shown empty, so queueing it would send the same message twice.
    blocking ??
      (initialDraft.pendingDraft(port.context) === null && draft.trim()
        ? false
        : ""),
    send,
  );
  useLiveComposer(composer, {
    port,
    running: active,
    controls: {
      onSend: send,
      onQueue: queue.onQueue,
      queued: queue.queued,
      onStop: () => {
        queue.stop();
        void run.cancel();
      },
      sendBlocked:
        retentionError ??
        lifecycle.blocked ??
        availability.sendBlocked ??
        modelBlocked,
      // A retained request is the person's to resolve; the key hint says so until it is. An
      // edge-refused message already says so in the transcript, once.
      notice:
        queue.released ??
        (intent.submit?.state === "unknown" && run.failure !== "refused"
          ? "Your last request is still unconfirmed. Retry it above before sending another."
          : undefined),
      modelSelection:
        intent.submit?.state !== "observed" && intent.submit
          ? intent.submit.modelSelection
          : modelSelection,
      selectionLocked,
      stopBlocked:
        retentionError ?? lifecycle.blocked ?? availability.stopBlocked,
      scope,
      attachUnavailable: unavailableTitle("attachments"),
    },
  });
  // The landing identity belongs to this owner's own admitted state: no saved turn, no captured or
  // unresolved request, no current turn. Nothing here re-reads the URL or observes the DOM.
  const controls = (
    <RunLifecycleControls
      lifecycle={lifecycle}
      turn={turn}
      disabled={controlsHeld}
    />
  );
  const emptyConversation =
    !turn &&
    !intent.submit &&
    !earlier.length &&
    !savedCurrent &&
    !acceptedRequest &&
    !initialPrompt &&
    !historyUnavailable;
  return (
    <ConversationBody
      earlier={earlier}
      current={
        <>
          {emptyConversation && (
            <div className={styles.hero}>
              <DailyQuote />
            </div>
          )}
          <LiveTurn
            turn={turn}
            intent={intent}
            earlier={earlier}
            controls={controls}
            refused={run.failure === "refused"}
          />
        </>
      }
      status={
        <>
          <SelectedRequestReceipt request={applied} scope={scope} />
          <CurrentRunStatus
            run={{
              ...run,
              busy: run.busy || lifecycle.busy || !!lifecycle.command,
            }}
            retentionError={retentionError}
            active={active}
            acceptedRequest={acceptedRequest}
            onDiscardUnrecoverable={onDiscardUnrecoverable}
            onDiscardUncertain={() =>
              void run.release().then((released) => {
                if (released) initialDraft.release(port.context);
              })
            }
            onSendInNewConversation={
              availability.originalClosed && onSendInNewConversation
                ? (signal) => onSendInNewConversation(draft, signal)
                : undefined
            }
          />
          {/* A pending control with no turn to host it (nothing observed yet) still needs its recovery. */}
          {!turn && controls}
        </>
      }
      files={
        <ConversationPanels
          port={port}
          turn={turn}
          earlier={earlier}
          onDecisionSettled={(runId) => {
            if (runId === port.context.runId) run.refreshAfterDecision();
          }}
          details={
            finished && checkpointId ? (
              <CheckpointActions
                lifecycle={lifecycle}
                checkpointId={checkpointId}
                disabled={controlsHeld}
              />
            ) : undefined
          }
          browser={
            browserRunId === port.context.runId ? (
              <ConnectedBrowserViewer
                key={port.context.runId}
                account={{
                  tenantId: port.context.tenantId,
                  actorId: port.context.actorId,
                }}
                clientId={port.context.selectedClientId}
                conversationId={port.context.conversationId}
                runId={port.context.runId}
                onTarget={onBrowserTarget ?? onLifecycleTarget}
              />
            ) : undefined
          }
        />
      }
    />
  );
}
