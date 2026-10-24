"use client";
import { useEffect, useRef, type RefObject } from "react";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import { UserMessage } from "../screens/conversation/UserMessage";
import { Button } from "@capiro/ui/button";
import { StatusPill } from "../ui/StatusPill";
import ui from "../ui/meri-ui.module.css";
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
import { RunLifecycleControls } from "./lifecycle/RunLifecycleControls";
import { SelectedRequestReceipt } from "./SelectedRequestReceipt";

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
          : "Sending to Meri."}
      </p>
    </article>
  );
}

/** Local composer availability; only the SDK/server may admit an original input or next turn. */
function composerAvailability(
  run: ReturnType<typeof useLiveRun>,
  turn: TurnView | null,
  earlier: readonly TurnView[],
  initialPrompt: string | undefined,
  initialBlocked: string | undefined,
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
    firstBlocked ??
    (isTerminal(turn?.runState) ? nextTurnBlocked : undefined) ??
    (busy
      ? "Meri is still handling your last command."
      : intent.submit?.state === "unknown"
        ? "Delivery of your last request is uncertain. Retry it before sending another."
        : intent.submit && !turn
          ? "Your request is being sent."
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

/** Storage uncertainty disables mutation controls while the transcript remains readable. */
function CurrentRunStatus({
  run,
  retentionError,
  active,
  acceptedRequest,
  savedCurrent,
  readyForNext,
  onCompose,
}: {
  run: ReturnType<typeof useLiveRun>;
  retentionError: string | undefined;
  active: boolean;
  acceptedRequest: ConversationStoredRequest | undefined;
  savedCurrent: TurnView | undefined;
  readyForNext: boolean;
  onCompose: () => void;
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
        savedCurrent={savedCurrent}
      />
      {readyForNext && (
        <section className={styles.stopCard} aria-label="Next message status">
          <h3>Ready</h3>
          <StatusPill tone="success">Complete</StatusPill>
          <p role="status" className={styles.muted}>
            You can send your next message.
          </p>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            onClick={onCompose}
          >
            Write next message
          </Button>
        </section>
      )}
    </>
  );
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
  onLifecycleTarget,
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
}) {
  const run = useLiveRun(
    port,
    initialPrompt,
    savedCurrent?.runId === port.context.runId ? acceptedRequest : undefined,
  );
  const { snapshot, intent } = run;
  const lifecycle = useRunLifecycle(
    port,
    run.suspendObservation,
    run.reconnect,
    onLifecycleTarget,
  );
  const observed = snapshot.observation
    ? {
        ...turnFromObservation(snapshot.observation, port.context.runId),
        ...(promptKey ? { promptKey } : {}),
      }
    : null;
  const turn = currentTurnView(observed, savedCurrent);
  const finished = isTerminal(turn?.runState);
  const active = !!turn && !finished;
  useDraftAcknowledgement(initialDraft, port, intent.submit, draft, onDraft);
  useSettledRefresh(finished, onSettled);
  const availability = composerAvailability(
    run,
    turn,
    earlier,
    initialPrompt,
    initialBlocked,
    nextTurnBlocked,
    nextTurnVerified,
    initialDraft.hasPending(port.context),
  );
  const retentionError =
    storageError ?? initialDraft.error() ?? run.storageError;
  const send = () => {
    if (retentionError || modelBlocked || lifecycle.blocked) return;
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
      stopBlocked:
        retentionError ?? lifecycle.blocked ?? availability.stopBlocked,
      scope,
      attachUnavailable: unavailableTitle("attachments"),
    },
  });
  return (
    <ConversationBody
      earlier={earlier}
      current={<LiveTurn turn={turn} intent={intent} earlier={earlier} />}
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
            savedCurrent={savedCurrent}
            readyForNext={
              availability.readyForNext && !retentionError && !lifecycle.blocked
            }
            onCompose={() => textareaRef.current?.focus()}
          />
          <RunLifecycleControls
            lifecycle={lifecycle}
            turn={turn}
            disabled={
              run.busy ||
              !!retentionError ||
              snapshot.status !== "ready" ||
              intent.submit?.state === "unknown" ||
              intent.cancel === "unknown"
            }
          />
        </>
      }
      files={<ConversationPanels port={port} turn={turn} earlier={earlier} />}
    />
  );
}
