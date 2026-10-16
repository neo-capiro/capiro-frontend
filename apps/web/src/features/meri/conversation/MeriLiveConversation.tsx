"use client";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
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
        showPrompt={
          (!!turn.promptKey || !earlier.length) &&
          shouldShowPrompt(turn, earlier)
        }
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

/** The session-bound run, with every turn already shown in this page above it. */
export function MeriLiveConversation({
  port,
  initialPrompt,
  earlier,
  scope,
  draft,
  onDraft,
  textareaRef,
  onNextTurn,
  nextTurnBlocked,
  historyStatus,
  promptKey,
  onSettled,
  savedCurrent,
}: {
  port: MeriConversationPort;
  initialPrompt: string | undefined;
  earlier: readonly TurnView[];
  scope: string;
  draft: string;
  onDraft: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** The run finished: send `prompt` as the conversation's next run. */
  onNextTurn: (prompt: string, finished: TurnView) => void;
  nextTurnBlocked?: string | undefined;
  historyStatus?: ReactNode;
  promptKey?: string | undefined;
  onSettled: () => void;
  savedCurrent?: TurnView | undefined;
}) {
  const run = useLiveRun(port, initialPrompt);
  const { snapshot, intent, busy } = run;
  const observed = snapshot.observation
    ? {
        ...turnFromObservation(snapshot.observation, port.context.runId),
        ...(promptKey ? { promptKey } : {}),
      }
    : null;
  const turn = currentTurnView(observed, savedCurrent);
  const finished = isTerminal(turn?.runState);
  const active = !!turn && !finished;
  const uncertain = intent.submit?.state === "unknown";
  const announced = useRef(false);
  useEffect(() => {
    if (finished && !announced.current) {
      announced.current = true;
      onSettled();
    }
  }, [finished, onSettled]);
  const firstBlocked =
    !turn && !intent.submit
      ? "Meri cannot verify whether a message is already in flight. Sending is blocked until its original identity can be recovered."
      : undefined;
  const send = () => {
    const prompt = draft.trim();
    if (turn && finished && !nextTurnBlocked) onNextTurn(prompt, turn);
  };
  return (
    <ConversationFrame
      scope={scope}
      earlier={earlier}
      historyStatus={historyStatus}
      current={<LiveTurn turn={turn} intent={intent} earlier={earlier} />}
      status={<RunStatus run={run} active={active} />}
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
        sendBlocked:
          firstBlocked ??
          (finished ? nextTurnBlocked : undefined) ??
          (busy
            ? "Meri is still handling your last command."
            : uncertain
              ? "Delivery of your last request is uncertain. Retry it before sending another."
              : intent.submit && !turn
                ? "Your request is being sent."
                : undefined),
        stopBlocked:
          busy || intent.cancel === "pending"
            ? "Meri is handling your last command."
            : undefined,
        scope,
        attachUnavailable: unavailableTitle("attachments"),
      }}
    />
  );
}
