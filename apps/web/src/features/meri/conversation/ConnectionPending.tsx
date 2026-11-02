import { Button } from "@capiro/ui/button";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import { UserMessage } from "../screens/conversation/UserMessage";
import type { LiveComposer } from "../MeriComposer";
import { ConversationBody } from "./ConversationFrame";
import type { useConversationSession } from "./useConversationSession";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";
import {
  controlUnreachableMessage,
  reconnectState,
} from "./control-reachability";
import { useReconnectSchedule } from "../../../shared/meri-conversations/reconnect-schedule";

type Session = ReturnType<typeof useConversationSession>;
/** The conversation session is being issued (or its run controls are mounting): a message can wait for it. */
export const CONNECTING_TO_MERI = "Connecting to Meri.";

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
          ? CONNECTING_TO_MERI
          : session.connection.unreachable
            ? controlUnreachableMessage
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
  const unreachable = !session.accessLost && !!connection.unreachable;
  // Issuance that control did not answer is retried on a backed-off schedule with the same exact
  // selectors; a refusal is never retried on its own.
  const reconnect = useReconnectSchedule(
    reconnectState(unreachable, status),
    connection.retry,
  );
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
                : unreachable
                  ? "Capiro is not reachable right now."
                  : "Conversation connection unavailable"}
      </h2>
      <p className={styles.muted}>
        {session.accessLost
          ? "The service could not verify your access to this conversation. It must recheck your account, client and exact conversation before reopening it."
          : unreachable
            ? "Your conversation is safe; we'll reconnect automatically."
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
            reconnect.reset();
            connection.retry();
            session.history.refresh();
          }}
        >
          {session.accessLost
            ? "Check access again"
            : status === "expired"
              ? "Reconnect"
              : unreachable
                ? "Retry"
                : "Try again"}
        </Button>
      )}
    </section>
  );
}

/**
 * A renewal that control did not answer (5xx: an authority that did not answer, or control unreachable), so
 * nothing is known to be refused: the transcript stays on screen, only sending waits, and the renewal is asked
 * again on the connection's backed-off schedule. Control answers 401 only for a definitive refusal, which
 * replaces the view instead (ConnectionStatus).
 */
export function UnverifiedAccessNotice({ session }: { session: Session }) {
  const { connection } = session;
  // The automatic schedule is the connection's own (useConversationConnection); this is presentation.
  return (
    <section role="status" className={styles.accessNotice}>
      <p className={styles.muted}>
        Capiro is not reachable right now. Everything above is unchanged;
        we&apos;ll reconnect automatically and sending resumes once the
        connection is back.
      </p>
      <Button
        type="button"
        variant="outline"
        className={ui.outline}
        onClick={() => {
          connection.resetReconnect();
          connection.retry();
          session.history.refresh();
        }}
      >
        Retry now
      </Button>
    </section>
  );
}

/** Saved reading is hidden after access loss until the exact session is reauthorized. */
export function ConnectionPending({ session }: { session: Session }) {
  const { connection, earlier } = session;
  const status = connection.state.status,
    waiting =
      status === "idle" || status === "connecting" || session.accessRechecking;
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
