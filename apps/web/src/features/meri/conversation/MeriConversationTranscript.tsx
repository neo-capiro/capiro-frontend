import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@capiro/ui/conversation";
import { Message, MessageContent } from "@capiro/ui/message";
import type { ConversationObservationSnapshot } from "@capiro/meri-client/conversation";
import { buildWorkspaceView } from "../workspace/workspace-view";
import styles from "../workspace/workspace.module.css";
/** Existing display projection receives only events already admitted by the public SDK. */
export function MeriConversationTranscript({
  observation,
}: {
  observation: ConversationObservationSnapshot | null;
}) {
  const first = observation?.events[0];
  const messages = first
    ? buildWorkspaceView(observation!.events, first.binding).messages
    : [];
  return (
    <section
      className={styles.transcriptPanel}
      aria-label="Current Meri transcript"
    >
      <h2>Conversation transcript</h2>
      {observation?.omittedPrefix && (
        <p role="status">Earlier events are omitted from this observed page.</p>
      )}
      {observation?.hasMore && (
        <p role="status">
          More current events are available. Load another history page or
          reconnect to observe them.
        </p>
      )}
      <Conversation
        className={styles.log}
        aria-label="Meri conversation"
        aria-live="polite"
        initial="instant"
        resize="instant"
      >
        <ConversationContent
          className={styles.messages}
          scrollClassName={styles.scroll}
          tabIndex={0}
          aria-label="Observed message history"
        >
          {!messages.length ? (
            <ConversationEmptyState
              title={
                observation
                  ? "No message events in this admitted page"
                  : "Load the current transcript"
              }
              description="Only service-admitted events are displayed."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.messageId} from="assistant">
                <MessageContent>
                  <p className={styles.response}>{message.text}</p>
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton aria-label="Scroll to latest observed message" />
      </Conversation>
    </section>
  );
}
