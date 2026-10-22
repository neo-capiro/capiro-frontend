import type { ReactNode } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@capiro/ui/conversation";
import { unavailableResources } from "../../../shared/meri-resources/unavailable";
import { ConversationTurn } from "./ConversationTurn";
import type { TurnView } from "./conversation-view";
import { shouldShowPrompt } from "./prompt-identity";
import styles from "./live.module.css";

/**
 * Figma 01.02 conversation layout for the ordinary route: heading, the turns shown in this page,
 * connection status, files and the composer. The composer has a stable position while
 * session-bound children change; this frame owns no service state.
 */
export function ConversationFrame({
  scope,
  children,
  composer,
  historyStatus,
}: {
  scope: string;
  children: ReactNode;
  composer: ReactNode;
  historyStatus?: ReactNode;
}) {
  return (
    <section className={styles.frame} aria-labelledby="meri-conversation">
      <div className={styles.heading}>
        <h2 id="meri-conversation">Conversation</h2>
        <p className={styles.muted}>{scope}</p>
      </div>
      {historyStatus ?? (
        <p className={styles.muted}>
          {unavailableResources.conversationHistory.summary}
        </p>
      )}
      {children}
      {composer}
    </section>
  );
}

/** Session-bound transcript, status and files may remount without replacing the composer. */
export function ConversationBody({
  earlier,
  current,
  status,
  files,
}: {
  earlier: readonly TurnView[];
  current: ReactNode;
  status: ReactNode;
  files: ReactNode;
}) {
  return (
    <>
      <Conversation
        className={styles.log}
        aria-label="Conversation turns"
        initial="instant"
        resize="instant"
      >
        <ConversationContent className={styles.turns}>
          {earlier.map((turn, index) => (
            <ConversationTurn
              key={turn.runId}
              turn={turn}
              label={`Earlier turn ${index + 1}`}
              showPrompt={shouldShowPrompt(turn, earlier.slice(0, index))}
            />
          ))}
          {current}
        </ConversationContent>
        <ConversationScrollButton aria-label="Scroll to latest message" />
      </Conversation>
      <div className={styles.status} aria-live="polite">
        {status}
      </div>
      {files}
    </>
  );
}
