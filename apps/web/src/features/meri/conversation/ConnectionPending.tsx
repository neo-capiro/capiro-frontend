import { Button } from "@capiro/ui/button";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import { UserMessage } from "../screens/conversation/UserMessage";
import type { LiveComposer } from "../MeriComposer";
import { ConversationBody } from "./ConversationFrame";
import type { useConversationSession } from "./useConversationSession";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";

type Session = ReturnType<typeof useConversationSession>;

/** Keep the selected draft editable while sends wait for current session/run controls. */
export function pendingConversationComposer(
  session: Session,
  scope: string,
): LiveComposer {
  const status = session.connection.state.status;
  return {
    onSend: () => undefined,
    draftBlocked: !session.selectedId
      ? "Confirming this conversation before saving a draft."
      : undefined,
    sendBlocked: session.accessLost
      ? "Verify access to this conversation before sending."
      : (session.storageError ??
        (status === "idle" ||
        status === "connecting" ||
        (status === "ready" && !session.latestTarget)
          ? "Connecting to Meri."
          : "Reconnect to Meri before sending.")),
    scope,
    attachUnavailable: unavailableTitle("attachments"),
  };
}

/** Connection recovery presents the same exact-run retry while private content stays hidden. */
function ConnectionStatus({
  session,
  waiting,
}: {
  session: Session;
  waiting: boolean;
}) {
  const { connection } = session;
  const status = connection.state.status;
  return (
    <section role="status" className={styles.status}>
      <h2>
        {session.accessLost
          ? waiting
            ? "Checking conversation access…"
            : "Conversation access unavailable"
          : session.latestTarget
            ? "A newer accepted turn is available"
            : status === "expired"
              ? "Conversation session expired"
              : waiting
                ? "Connecting to Meri."
                : "Conversation connection unavailable"}
      </h2>
      <p className={styles.muted}>
        {session.accessLost
          ? "The service could not verify your access to this conversation. It must recheck your account, client and exact conversation before reopening it."
          : status === "unavailable"
            ? "The service could not verify this conversation. No sample transcript was substituted."
            : "The service rechecks your account, client and exact conversation before issuing a short-lived connection."}
      </p>
      {!waiting && (session.accessLost || !session.latestTarget) && (
        <Button
          type="button"
          variant="outline"
          className={ui.outline}
          onClick={() => {
            connection.retry();
            session.history.refresh();
          }}
        >
          {session.accessLost
            ? "Check access again"
            : status === "expired"
              ? "Reconnect"
              : "Try again"}
        </Button>
      )}
    </section>
  );
}

/** Saved reading is hidden after access loss until the exact session is reauthorized. */
export function ConnectionPending({ session }: { session: Session }) {
  const { connection, earlier } = session;
  const status = connection.state.status,
    waiting = status === "idle" || status === "connecting";
  const pending =
    !session.accessLost &&
    connection.pending &&
    !earlier.some(
      (turn) =>
        turn.runId ===
        session.continuation.intent?.receipt?.targetBinding.runId,
    )
      ? connection.pending
      : undefined;
  return (
    <ConversationBody
      earlier={session.accessLost ? [] : earlier}
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
      status={<ConnectionStatus session={session} waiting={waiting} />}
      files={null}
    />
  );
}
