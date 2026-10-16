"use client";
import type { RefObject } from "react";
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
  type TurnView,
} from "./conversation-view";
import { useLiveRun } from "./useLiveRun";
import styles from "./live.module.css";

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
}) {
  const run = useLiveRun(port, initialPrompt);
  const { snapshot, intent, busy } = run;
  const turn = snapshot.observation
    ? turnFromObservation(snapshot.observation, port.context.runId)
    : null;
  const finished = isTerminal(turn?.runState);
  const active = !!turn && !finished;
  const uncertain = intent.submit?.state === "unknown";
  const send = () => {
    const prompt = draft.trim();
    if (turn && finished) onNextTurn(prompt, turn);
    else if (!turn && !intent.submit) void run.submit(prompt);
    else return;
    onDraft("");
  };
  return (
    <ConversationFrame
      scope={scope}
      earlier={earlier}
      current={
        turn ? (
          <ConversationTurn turn={turn} label="Current turn" />
        ) : intent.submit ? (
          <article
            className={`${styles.turn} ${styles.pending}`}
            aria-label="Current turn"
          >
            <UserMessage>{intent.submit.prompt}</UserMessage>
            <p className={styles.muted}>
              {uncertain
                ? "Delivery is uncertain. Retry sends exactly the same request; nothing is duplicated."
                : "Sending to Meri…"}
            </p>
          </article>
        ) : null
      }
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
        sendBlocked: busy
          ? "Meri is still handling your last command."
          : uncertain
            ? "Delivery of your last request is uncertain. Retry it before sending another."
            : intent.submit && !turn
              ? "Your request is being sent."
              : undefined,
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
