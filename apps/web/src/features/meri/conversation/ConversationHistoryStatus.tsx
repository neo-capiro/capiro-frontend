import { Button } from "@capiro/ui/button";
import type { useConversationSession } from "./useConversationSession";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";

type Session = ReturnType<typeof useConversationSession>;

/** Write uncertainty has its own recovery controls; a read snapshot never clears it. */
function TurnRecoveryStatus({ session }: { session: Session }) {
  const { continuation } = session;
  return (
    <>
      {(session.recoveryNeeded || session.unknownReservation) && (
        <div role="status">
          <p>
            A turn may already be in flight. Sending another message is blocked
            until it can be recovered.
          </p>
          {session.unknownReservation && (
            <p>
              The original message identity is unavailable after reopening this
              page. A reserved run alone does not establish that no message was
              sent.
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
            {session.recoveryNeeded
              ? "Recover same turn"
              : "Check reserved turn"}
          </Button>
        </div>
      )}
      {continuation.failed && (
        <p role="alert">
          Turn recovery unavailable. No replacement turn was requested.
          {continuation.intent
            ? " The original request identity is retained."
            : ""}
        </p>
      )}
    </>
  );
}

/** Every partial, unavailable or uncertain saved-history state remains explicit. */
export function ConversationHistoryStatus({ session }: { session: Session }) {
  const { history } = session;
  const loading = history.query.isPending || history.query.isRefetching;
  return (
    <section aria-label="Saved conversation history" className={styles.muted}>
      {!history.selected ? (
        <p>A verified conversation is required to read saved history.</p>
      ) : loading ? (
        <p role="status">Loading saved conversation history.</p>
      ) : history.unavailable ? (
        <p role="status">
          Saved conversation history unavailable. No sample transcript was
          substituted.
        </p>
      ) : (
        <p>
          {history.query.hasNextPage
            ? "Part of the saved conversation is shown."
            : "Saved conversation history loaded."}
        </p>
      )}
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
        {!history.unavailable && history.query.hasNextPage && (
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={history.query.isFetching}
            onClick={() => void history.query.fetchNextPage()}
          >
            Load more saved turns
          </Button>
        )}
      </div>
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
      {history.tail.error && !history.unavailable && (
        <p role="status">
          The latest turn could not be verified. Reload saved history before
          starting another turn.
        </p>
      )}
      <TurnRecoveryStatus session={session} />
    </section>
  );
}
