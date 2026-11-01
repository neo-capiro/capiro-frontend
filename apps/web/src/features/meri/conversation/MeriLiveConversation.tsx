"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
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

/** The current admitted segment, or the exact immutable request whose ACK is still pending. */
function LiveTurn({
  turn,
  intent,
  earlier,
}: {
  turn: TurnView | null;
  intent: ReturnType<typeof useLiveRun>["intent"];
  earlier: readonly TurnView[];
}) {
  if (turn)
    return (
      <ConversationTurn
        turn={turn}
        label="Current turn"
        showPrompt={shouldShowPrompt(turn, earlier)}
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
          ? "Delivery is uncertain. Retry sends exactly the same request; nothing is duplicated."
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
) {
  const { intent, busy } = run;
  const initial =
    !turn &&
    !intent.submit &&
    !initialPrompt &&
    !earlier.length &&
    !initialBlocked;
  const firstBlocked =
    !turn && !intent.submit && !initial
      ? (initialBlocked ??
        "Recover the original message identity before sending.")
      : undefined;
  const sendBlocked =
    newIntentBlocked ??
    firstBlocked ??
    (isTerminal(turn?.runState) ? nextTurnBlocked : undefined) ??
    (busy
      ? "Meri is still handling your last command."
      : intent.submit?.state === "unknown"
        ? "Delivery of your last request is uncertain. Retry it before sending another."
        : intent.submit && !turn
          ? intent.submit.state === "observed"
            ? "Reload the transcript to verify the current run."
            : "Your request is being sent."
          : undefined);
  return {
    initial,
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

/** Refresh saved history once this mounted run reaches a terminal state. */
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

/** Storage uncertainty disables mutation controls while the transcript remains readable. */
function CurrentRunStatus({
  run,
  retentionError,
  active,
  acceptedRequest,
}: {
  run: ReturnType<typeof useLiveRun>;
  retentionError: string | undefined;
  active: boolean;
  acceptedRequest: ConversationStoredRequest | undefined;
}) {
  return (
    <>
      {retentionError && (
        <p role="alert" className={styles.muted}>
          {retentionError}
        </p>
      )}
      <RunStatus
        run={{ ...run, busy: run.busy || !!retentionError }}
        active={active}
        acceptedRequest={acceptedRequest}
      />
    </>
  );
}

/**
 * A finished run needs no announcement: the composer is already open. If nothing else holds focus,
 * the cursor returns to it so the next message can be typed at once.
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
  nextTurnVerified = false,
  initialBlocked,
  composer,
  promptKey,
  onSettled,
  savedCurrent,
  acceptedRequest,
  storageError,
  modelSelection,
  modelBlocked,
  skillSelection,
  newIntentBlocked,
  onLifecycleTarget,
  onBrowserTarget,
  historyUnavailable = false,
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
  onNextTurn: (prompt: string, finished: TurnView) => void;
  nextTurnBlocked?: string | undefined;
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
  modelSelection?: ConversationStoredRequest["modelSelection"];
  modelBlocked?: string | undefined;
  skillSelection?: ConversationSkillSelection;
  onLifecycleTarget: (target: LifecycleTarget) => void;
  /** Opens a browser resume/observation target from this run; lifecycle routing is the default. */
  onBrowserTarget?: ((target: LifecycleTarget) => void) | undefined;
  /** The saved-history read failed: an empty-looking hero must not stand in for that failure. */
  historyUnavailable?: boolean;
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
  const observed = displayedObservation
    ? {
        ...turnFromObservation(displayedObservation, port.context.runId),
        ...(promptKey ? { promptKey } : {}),
      }
    : null;
  const turn = currentTurnView(observed, savedCurrent);
  const finished = isTerminal(turn?.runState);
  const active = !!turn && !finished;
  // Browser controls belong to a run that used the browser (an admitted receipt) or to a website
  // task about to be sent; once mounted they stay mounted so a live session is never recreated.
  const [browserMounted, setBrowserMounted] = useState(false);
  if (
    !browserMounted &&
    ((turn?.browserReceipts.length ?? 0) > 0 || !!skillSelection?.siteWorkflow)
  )
    setBrowserMounted(true);
  useDraftAcknowledgement(initialDraft, port, intent.submit, draft, onDraft);
  useSettledRefresh(finished, onSettled);
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
  );
  const retentionError =
    storageError ?? initialDraft.error() ?? run.storageError;
  useComposerReturn(
    availability.readyForNext && !retentionError && !lifecycle.blocked,
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
        ).sendBlocked
      : availability.sendBlocked);
  const send = () => {
    if (retentionError || modelBlocked || lifecycle.blocked) return;
    // A new intent carrying a skill the current rollout does not admit is refused here, before the
    // first request or next-turn reservation is recorded. The selection itself is left intact.
    if (newIntentBlocked) return;
    const prompt = draft.trim();
    if (availability.initial) {
      void run.submitInitial(
        prompt,
        (request) => initialDraft.begin(port.context, request, draft),
        modelSelection,
        skillSelection,
      );
    } else if (
      !initialDraft.hasPending(port.context) &&
      turn &&
      finished &&
      !nextTurnBlocked
    )
      onNextTurn(prompt, turn);
  };
  useLiveComposer(composer, {
    port,
    running: active,
    controls: {
      onSend: send,
      onStop: () => void run.cancel(),
      sendBlocked:
        retentionError ??
        lifecycle.blocked ??
        availability.sendBlocked ??
        modelBlocked,
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
          <LiveTurn turn={turn} intent={intent} earlier={earlier} />
        </>
      }
      status={
        <>
          <SelectedRequestReceipt
            request={snapshot.acceptedRequest ?? acceptedRequest}
            scope={scope}
          />
          <CurrentRunStatus
            run={{
              ...run,
              busy: run.busy || lifecycle.busy || !!lifecycle.command,
            }}
            retentionError={retentionError}
            active={active}
            acceptedRequest={acceptedRequest}
          />
          <RunLifecycleControls
            lifecycle={lifecycle}
            turn={turn}
            disabled={controlsHeld}
          />
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
            browserMounted ? (
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
