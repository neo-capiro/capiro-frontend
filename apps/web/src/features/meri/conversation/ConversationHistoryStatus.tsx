import { Button } from "@capiro/ui/button";
import type { useConversationSession } from "./useConversationSession";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";
import {
  controlFailure,
  controlFailureMessage,
  controlReconnectingMessage,
} from "./control-reachability";
import { useReconnectSchedule } from "../../../shared/meri-conversations/reconnect-schedule";

type Session = ReturnType<typeof useConversationSession>;

/** Unresolved writes keep recovery controls until exact completed-request history acknowledges them. */
function TurnRecoveryStatus({ session }: { session: Session }) {
  const { continuation } = session;
  // Control never answered the check (or the edge refused it): the retained message is kept and the
  // same check runs again on request. Only control's own reservation report holds the hard lock.
  const unanswered =
    continuation.failure &&
    session.recoveryNeeded &&
    !session.unknownReservation
      ? continuation.failure
      : undefined;
  return (
    <>
      {continuation.notReady && continuation.intent ? (
        <div role="status">
          <p>
            Meri is still finishing up. Your message is saved; try again in a
            moment.
          </p>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={continuation.busy}
            onClick={() => void continuation.retry()}
          >
            Check again
          </Button>
        </div>
      ) : unanswered ? (
        <div role="status">
          <p>{controlFailureMessage(unanswered)}</p>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={continuation.busy}
            onClick={() => void continuation.retry()}
          >
            Try again
          </Button>
        </div>
      ) : (
        (session.recoveryNeeded || session.unknownReservation) && (
          <div role="status">
            <p>
              Your last message may still be in progress. Check again before
              sending another.
            </p>
            {session.unknownReservation && (
              <p>
                After reopening this page, Capiro cannot tell whether your last
                message was sent.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className={ui.outline}
              disabled={continuation.busy}
              onClick={() => {
                if (session.recoveryNeeded) void continuation.retry();
                else void session.readReservation();
              }}
            >
              Check again
            </Button>
          </div>
        )
      )}
      {continuation.failed && !continuation.notReady && !unanswered && (
        <p role="alert">
          Capiro could not check your last message. Nothing new was sent.
        </p>
      )}
      {continuation.busy && (
        <p role="status">Checking your last message. Nothing new is sent.</p>
      )}
    </>
  );
}

/**
 * History restores itself: a healthy conversation shows nothing, with the manual
 * re-read behind a details disclosure. A partial, unavailable or failed read stays explicit,
 * and a failed read is never presented as an empty chat.
 */
export function ConversationHistoryStatus({ session }: { session: Session }) {
  const { history } = session;
  // Only the first read announces loading; a re-read keeps the last state on screen.
  const loading = history.query.isPending;
  // Control did not answer the read: say so once and re-read on a backed-off schedule. Only the
  // read that failed is repeated: re-reading the saved pages for a failed latest-turn read would
  // blank that read while in flight and restart the ladder every time.
  const unreachableSaved =
    history.unavailable &&
    controlFailure(history.query.error) === "unreachable";
  const unreachableLatest =
    !unreachableSaved && controlFailure(history.tail.error) === "unreachable";
  const unreachable = unreachableSaved || unreachableLatest;
  const { refetch: refetchLatest } = history.tail;
  const reconnect = useReconnectSchedule(
    unreachableSaved
      ? history.query.isFetching
        ? "busy"
        : "failing"
      : unreachableLatest
        ? history.tail.isFetching
          ? "busy"
          : "failing"
        : "ok",
    unreachableSaved ? history.refresh : () => void refetchLatest(),
  );
  const recovered = !loading && history.selected && !history.unavailable;
  // A healthy conversation restores itself; the manual re-read and diagnostics stay behind a
  // disclosure and disappear entirely when there is nothing to report.
  const diagnostics = !!history.tail.error || !!session.latestTarget;
  return (
    <section aria-label="Saved conversation history">
      {session.storageError && <p role="alert">{session.storageError}</p>}
      {!history.selected ? (
        <p>A verified conversation is required to read saved history.</p>
      ) : loading ? (
        <p role="status">Loading saved conversation history.</p>
      ) : unreachable ? (
        <div role="status" className={styles.historyIssue}>
          <p>{controlReconnectingMessage}</p>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={history.query.isFetching}
            onClick={() => {
              reconnect.reset();
              history.refresh();
            }}
          >
            Retry
          </Button>
        </div>
      ) : history.unavailable ? (
        <div role="status" className={styles.historyIssue}>
          <p>
            Saved conversation history unavailable. No sample transcript was
            substituted.
          </p>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={history.query.isFetching}
            onClick={history.refresh}
          >
            Reload saved history
          </Button>
        </div>
      ) : history.query.hasNextPage ? (
        // Only a partial view is worth saying; a fully restored history is just the transcript.
        <p role="status">Part of the saved conversation is shown.</p>
      ) : null}
      {recovered && history.query.hasNextPage && (
        <>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={history.query.isFetching}
            onClick={() => void history.query.fetchNextPage()}
          >
            Load more saved turns
          </Button>
        </>
      )}
      {history.tail.error && !history.unavailable && !unreachable && (
        <p role="status">
          The latest turn could not be verified. Reload saved history before
          starting another turn.
        </p>
      )}
      <TurnRecoveryStatus session={session} />
      {diagnostics && (
        <details className={styles.historyDetails}>
          <summary>History details</summary>
          <div className={styles.statusRow}>
            <Button
              type="button"
              variant="outline"
              className={ui.outline}
              disabled={!history.selected || history.query.isFetching}
              onClick={history.refresh}
            >
              Reload saved history
            </Button>
            {session.latestTarget && (
              <Button
                type="button"
                variant="outline"
                className={ui.outline}
                onClick={session.openLatest}
              >
                Open latest accepted turn
              </Button>
            )}
          </div>
        </details>
      )}
    </section>
  );
}
