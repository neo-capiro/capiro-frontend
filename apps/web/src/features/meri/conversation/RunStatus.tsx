import { Button } from "@capiro/ui/button";
import type { useLiveRun } from "./useLiveRun";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import ui from "../ui/meri-ui.module.css";
import styles from "./live.module.css";

/** Connection, delivery and stop feedback for the current run; never a run outcome by itself. */
export function RunStatus({
  run,
  active,
  acceptedRequest,
}: {
  run: ReturnType<typeof useLiveRun>;
  /** The run has not reached a terminal status. */
  active: boolean;
  acceptedRequest?: ConversationStoredRequest | undefined;
}) {
  const { snapshot, intent, busy } = run;
  const uncertain = intent.submit?.state === "unknown";
  return (
    <>
      {run.error && (
        <p role="alert" className={styles.muted}>
          Conversation operation unavailable: {run.error}. No sample response
          was substituted.
        </p>
      )}
      {run.transcript === "loading" && (
        <p role="status" className={styles.muted}>
          Loading this conversation…
        </p>
      )}
      {run.transcript === "unavailable" && !uncertain && (
        <div className={styles.statusRow}>
          <p className={styles.muted}>
            The current transcript could not be loaded.
          </p>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={busy}
            onClick={() => void run.history()}
          >
            Reload transcript
          </Button>
        </div>
      )}
      {uncertain && (
        <div className={styles.statusRow}>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={busy}
            onClick={() => void run.submit(intent.submit!.prompt, true)}
          >
            Retry same request
          </Button>
        </div>
      )}
      {!intent.submit &&
        acceptedRequest &&
        snapshot.observation?.runState === "queued" && (
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={busy}
            onClick={() => void run.recover(acceptedRequest)}
          >
            Continue accepted request
          </Button>
        )}
      {active && <ObservationStatus run={run} />}
      {snapshot.cancelReceipt && (
        <p role="status" className={styles.muted}>
          Stop request answered: run {snapshot.cancelReceipt.state}.
        </p>
      )}
      {intent.cancel === "unknown" && !snapshot.cancelReceipt && (
        <p role="status" className={styles.muted}>
          The stop request may not have reached Meri. Press Stop again to retry.
        </p>
      )}
      {active && (
        <p className={styles.muted}>
          Leaving this page stops watching; the run keeps going unless you press
          Stop.
        </p>
      )}
    </>
  );
}

/** Watching an unfinished run: receiving, resuming from the cursor, or stopped trying. */
function ObservationStatus({ run }: { run: ReturnType<typeof useLiveRun> }) {
  const { observing } = run;
  return (
    <>
      {observing === "live" && (
        <p role="status" className={styles.muted}>
          Receiving updates from Meri.
        </p>
      )}
      {observing === "reconnecting" && (
        <p role="status" className={styles.muted}>
          Connection interrupted. Reconnecting from the last received update…
        </p>
      )}
      {observing === "stalled" && (
        <div className={styles.statusRow}>
          <p role="status" className={styles.muted}>
            Updates stopped arriving. The current run status is unknown.
            Reconnect to check for updates.
          </p>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            onClick={run.reconnect}
          >
            Reconnect
          </Button>
        </div>
      )}
    </>
  );
}
