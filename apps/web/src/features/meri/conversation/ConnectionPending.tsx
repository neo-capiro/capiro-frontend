import { Button } from "@capiro/ui/button";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import { UserMessage } from "../screens/conversation/UserMessage";
import { ConversationFrame } from "./ConversationFrame";
import { ConversationHistoryStatus } from "./ConversationHistoryStatus";
import type { useConversationSession } from "./useConversationSession";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";

/** Saved reading remains available when no current writer session can be issued. */
export function ConnectionPending({
  session,
  scope,
}: {
  session: ReturnType<typeof useConversationSession>;
  scope: string;
}) {
  const { connection, earlier } = session;
  const status = connection.state.status,
    waiting = status === "idle" || status === "connecting";
  const pending =
    connection.pending &&
    !earlier.some(
      (turn) =>
        turn.runId ===
        session.continuation.intent?.receipt?.targetBinding.runId,
    )
      ? connection.pending
      : undefined;
  return (
    <ConversationFrame
      scope={scope}
      earlier={earlier}
      historyStatus={<ConversationHistoryStatus session={session} />}
      current={
        pending ? (
          <article
            className={`${styles.turn} ${styles.pending}`}
            aria-label="Current turn"
          >
            <UserMessage>{pending}</UserMessage>
            <p className={styles.muted}>
              Message delivery has not been confirmed. Reconnecting retains its
              original request identity.
            </p>
          </article>
        ) : null
      }
      status={
        <section role="status" className={styles.status}>
          <h2>
            {session.latestTarget
              ? "A newer accepted turn is available"
              : status === "expired"
                ? "Conversation session expired"
                : waiting
                  ? "Connecting to Meri."
                  : "Conversation connection unavailable"}
          </h2>
          <p className={styles.muted}>
            {status === "unavailable"
              ? "The service could not verify this conversation. No sample transcript was substituted."
              : "The service rechecks your account, client and exact conversation before issuing a short-lived connection."}
          </p>
          {!waiting && !session.latestTarget && (
            <Button
              type="button"
              variant="outline"
              className={ui.outline}
              onClick={() => {
                connection.retry();
                session.history.refresh();
              }}
            >
              {status === "expired" ? "Reconnect" : "Try again"}
            </Button>
          )}
        </section>
      }
      files={null}
      draft={session.draft}
      onDraft={session.setDraft}
      textareaRef={session.textarea}
      running={false}
      composer={{
        onSend: () => undefined,
        sendBlocked: waiting
          ? "Connecting to Meri."
          : "Reconnect to Meri before sending.",
        scope,
        attachUnavailable: unavailableTitle("attachments"),
      }}
    />
  );
}
