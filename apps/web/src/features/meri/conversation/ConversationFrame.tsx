import type { ReactNode, RefObject } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@capiro/ui/conversation";
import { unavailableResources } from "../../../shared/meri-resources/unavailable";
import { MeriComposer, type LiveComposer } from "../MeriComposer";
import { ConversationTurn } from "./ConversationTurn";
import type { TurnView } from "./conversation-view";
import { shouldShowPrompt } from "./prompt-identity";
import styles from "./live.module.css";

/**
 * Figma 01.02 conversation layout for the ordinary route: heading, the turns shown in this page,
 * connection status, files and the composer. The draft belongs to the caller and survives
 * session changes; this frame owns no service state.
 */
export function ConversationFrame({
  scope,
  earlier,
  current,
  status,
  files,
  draft,
  onDraft,
  textareaRef,
  composer,
  running,
}: {
  scope: string;
  earlier: readonly TurnView[];
  /** The current run's turn, or a pending request while it is being sent. */
  current: ReactNode;
  status: ReactNode;
  files: ReactNode;
  draft: string;
  onDraft: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  composer: LiveComposer;
  running: boolean;
}) {
  return (
    <section className={styles.frame} aria-labelledby="meri-conversation">
      <div className={styles.heading}>
        <h2 id="meri-conversation">Conversation</h2>
        <p className={styles.muted}>{scope}</p>
      </div>
      <p className={styles.muted}>
        {unavailableResources.conversationHistory.summary}
      </p>
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
      <MeriComposer
        draft={draft}
        onDraft={onDraft}
        textareaRef={textareaRef}
        assetSet="cited-answer"
        running={running}
        live={composer}
      />
    </section>
  );
}
