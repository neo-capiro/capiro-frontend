"use client";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import { UserMessage } from "../screens/conversation/UserMessage";
import { ConversationArtifacts } from "./ConversationArtifacts";
import { ConversationFrame } from "./ConversationFrame";
import { ConversationTurn } from "./ConversationTurn";
import { RunStatus } from "./RunStatus";
import {
  conversationArtifacts,
  isTerminal,
  turnFromObservation,
  currentTurnView,
  type TurnView,
} from "./conversation-view";
import { useLiveRun } from "./useLiveRun";
import { shouldShowPrompt } from "./prompt-identity";
import type { InitialDraftOwner } from "./initial-draft";
import styles from "./live.module.css";

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
  return {
    initial,
    sendBlocked:
      firstBlocked ??
      (isTerminal(turn?.runState) ? nextTurnBlocked : undefined) ??
      (busy
        ? "Meri is still handling your last command."
        : intent.submit?.state === "unknown"
          ? "Delivery of your last request is uncertain. Retry it before sending another."
          : intent.submit && !turn
            ? "Your request is being sent."
            : undefined),
    stopBlocked:
      busy || intent.cancel === "pending"
        ? "Meri is handling your last command."
        : undefined,
  };
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
  initialBlocked,
  historyStatus,
  promptKey,
  onSettled,
  savedCurrent,
  acceptedRequest,
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
  initialBlocked?: string | undefined;
  historyStatus?: ReactNode;
  promptKey?: string | undefined;
  onSettled: () => void;
  savedCurrent?: TurnView | undefined;
  acceptedRequest?: ConversationStoredRequest | undefined;
}) {
  const run = useLiveRun(port, initialPrompt);
  const { snapshot, intent } = run;
  const observed = snapshot.observation
    ? {
        ...turnFromObservation(snapshot.observation, port.context.runId),
        ...(promptKey ? { promptKey } : {}),
      }
    : null;
  const turn = currentTurnView(observed, savedCurrent);
  const finished = isTerminal(turn?.runState);
  const active = !!turn && !finished;
  useEffect(() => {
    // Only a positively observed submit can consume the text that was sent. A late ACK must
    // leave newer edits alone, including edits made while this session was disconnected.
    if (initialDraft.acknowledge(port.context, intent.submit, draft))
      onDraft("");
  }, [initialDraft, port.context, intent.submit, draft, onDraft]);
  const announced = useRef(false);
  useEffect(() => {
    if (finished && !announced.current) {
      announced.current = true;
      onSettled();
    }
  }, [finished, onSettled]);
  const availability = composerAvailability(
    run,
    turn,
    earlier,
    initialPrompt,
    initialBlocked,
    nextTurnBlocked,
  );
  const send = () => {
    const prompt = draft.trim();
    if (availability.initial) {
      void run.submitInitial(prompt, (request) =>
        initialDraft.begin(port.context, request, draft),
      );
    } else if (
      !initialDraft.hasPending(port.context) &&
      turn &&
      finished &&
      !nextTurnBlocked
    )
      onNextTurn(prompt, turn);
  };
  return (
    <ConversationFrame
      scope={scope}
      earlier={earlier}
      historyStatus={historyStatus}
      current={<LiveTurn turn={turn} intent={intent} earlier={earlier} />}
      status={
        <RunStatus
          run={run}
          active={active}
          acceptedRequest={acceptedRequest}
        />
      }
      files={
        <ConversationArtifacts
          artifacts={conversationArtifacts(turn ? [...earlier, turn] : earlier)}
          access={port.artifacts}
        />
      }
      draft={draft}
      onDraft={onDraft}
      textareaRef={textareaRef}
      running={active}
      composer={{
        onSend: send,
        onStop: () => void run.cancel(),
        sendBlocked: availability.sendBlocked,
        stopBlocked: availability.stopBlocked,
        scope,
        attachUnavailable: unavailableTitle("attachments"),
      }}
    />
  );
}
