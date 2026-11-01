import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@capiro/ui/button";
import { unavailableTitle } from "../../../shared/meri-resources/unavailable";
import { UserMessage } from "../screens/conversation/UserMessage";
import type { LiveComposer } from "../MeriComposer";
import { ConversationBody } from "./ConversationFrame";
import type { useConversationSession } from "./useConversationSession";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";
import { controlUnreachableMessage } from "./control-reachability";
import { createAccessRecheck } from "./access-recheck";
import { useReconnectSchedule } from "../../../shared/meri-conversations/reconnect-schedule";

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
          : session.connection.unreachable
            ? controlUnreachableMessage
            : "Reconnect to Meri before sending.")),
    scope,
    attachUnavailable: unavailableTitle("attachments"),
  };
}

/**
 * The first access loss of an episode rechecks itself once after a short delay; the manual check
 * stays for a loss that persists. The latest session is read at fire time, never captured.
 */
function useAccessRecheck(session: Session) {
  const [recheck] = useState(() => createAccessRecheck());
  const { accessLost } = session;
  const { retry } = session.connection;
  const { refresh } = session.history;
  useEffect(() => {
    recheck.observe(accessLost, () => {
      retry();
      refresh();
    });
  }, [recheck, accessLost, retry, refresh]);
  useEffect(() => () => recheck.dispose(), [recheck]);
  return useSyncExternalStore(
    recheck.subscribe,
    recheck.pending,
    recheck.pending,
  );
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
    unreachable
      ? "failing"
      : status === "connecting" || status === "idle"
        ? "busy"
        : "ok",
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
 * The access check was not answered, so nothing is known to be refused: the transcript stays on screen
 * and only sending waits for a fresh check. A real refusal replaces the view instead (ConnectionStatus).
 */
export function UnverifiedAccessNotice({ session }: { session: Session }) {
  return (
    <section role="status" className={styles.accessNotice}>
      <p className={styles.muted}>
        Meri could not confirm your access to this conversation just now.
        Everything above is unchanged; sending resumes once access is checked.
      </p>
      <Button
        type="button"
        variant="outline"
        className={ui.outline}
        onClick={() => {
          session.connection.retry();
          session.history.refresh();
        }}
      >
        Check access again
      </Button>
    </section>
  );
}

/** Saved reading is hidden after access loss until the exact session is reauthorized. */
export function ConnectionPending({ session }: { session: Session }) {
  const { connection, earlier } = session;
  const rechecking = useAccessRecheck(session);
  const status = connection.state.status,
    waiting = status === "idle" || status === "connecting" || rechecking;
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
