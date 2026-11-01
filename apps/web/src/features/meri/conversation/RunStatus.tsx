import { Button } from "@capiro/ui/button";
import { useEffect, useState } from "react";
import type { useLiveRun } from "./useLiveRun";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import ui from "../ui/meri-ui.module.css";
import { StatusPill, type StatusTone } from "../ui/StatusPill";
import styles from "./live.module.css";
import { matchesStoredRequest } from "./run-commands";

/**
 * Connection, delivery and stop feedback for the current run; never a run outcome by itself. A
 * finished turn shows nothing here beyond a real error or an unresolved request.
 */
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
  const refreshable =
    snapshot.status !== "disposed" &&
    (snapshot.observation?.runState === "paused" ||
      snapshot.observation?.runState === "waiting-for-approval" ||
      run.observing === "stalled" ||
      run.transcript === "unavailable" ||
      uncertain ||
      intent.cancel === "unknown");
  const canContinue =
    acceptedRequest &&
    snapshot.observation?.runState === "queued" &&
    (!intent.submit ||
      (uncertain && matchesStoredRequest(intent.submit, acceptedRequest)));
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
        <p className={styles.muted}>
          The current transcript could not be loaded.
        </p>
      )}
      {uncertain && !canContinue && (
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
      {canContinue && (
        <Button
          type="button"
          variant="outline"
          className={ui.outline}
          disabled={busy}
          onClick={() => void run.recover(acceptedRequest!)}
        >
          Continue accepted request
        </Button>
      )}
      {active && <ObservationStatus key={run.observing} run={run} />}
      {refreshable && (
        <div className={styles.statusRow}>
          <Button
            type="button"
            variant="outline"
            className={ui.outline}
            disabled={busy}
            onClick={run.refreshRunStatus}
          >
            Refresh run status
          </Button>
        </div>
      )}
      <StopStatus run={run} active={active} />
      {active && (
        <p className={styles.muted}>
          Leaving this page stops watching and does not cancel the run. Use Stop
          to request cancellation.
        </p>
      )}
    </>
  );
}

/**
 * Receipt state is evidence of the outcome at Stop; it never proves physical cleanup. A Stop that
 * arrived after the run had already finished keeps saying so, because the person asked for
 * something that did not happen. Cancelling feedback retires once the run settles; the turn's own
 * Cancelled state is the outcome.
 */
function stopFeedback(
  run: ReturnType<typeof useLiveRun>,
  active: boolean,
): {
  title: string;
  tone: StatusTone;
  status: string;
  message: string;
} | null {
  const { snapshot, intent } = run;
  const receipt = snapshot.cancelReceipt?.state;
  if (receipt === "completed")
    return {
      title: "Run already completed",
      tone: "success",
      status: "Complete",
      message: "The run had already completed when the stop request arrived.",
    };
  if (receipt === "failed")
    return {
      title: "Run already failed",
      tone: "danger",
      status: "Attention",
      message: "The run had already failed when the stop request arrived.",
    };
  if (receipt === "cancelled" && active)
    return {
      title: "Cancelling",
      tone: "warning",
      status: "Attention",
      message: "Meri is finishing the current safe step before stopping.",
    };
  if (intent.cancel === "pending")
    return {
      title: "Requesting stop",
      tone: "warning",
      status: "Attention",
      message: "Requesting stop…",
    };
  if (intent.cancel === "unknown")
    return {
      title: "Stop request uncertain",
      tone: "warning",
      status: "Attention",
      message:
        "The stop request may not have reached Meri. Retry Stop to check the same request.",
    };
  return null;
}

/** Figma 450:88742/450:88754, qualified by the evidence the current public contract supplies. */
function StopStatus({
  run,
  active,
}: {
  run: ReturnType<typeof useLiveRun>;
  active: boolean;
}) {
  const feedback = stopFeedback(run, active);
  if (!feedback) return null;
  const retry = run.intent.cancel === "unknown" && !run.snapshot.cancelReceipt;
  return (
    <section className={styles.stopCard} aria-label="Stop status">
      <h3>{feedback.title}</h3>
      <StatusPill tone={feedback.tone}>{feedback.status}</StatusPill>
      <p role="status" className={styles.muted}>
        {feedback.message}
      </p>
      <Button
        type="button"
        variant="outline"
        className={ui.outline}
        disabled={run.busy}
        onClick={() => void (retry ? run.cancel() : run.history())}
      >
        {retry ? "Retry Stop" : "Reload transcript"}
      </Button>
    </section>
  );
}

/** Watching an unfinished run: receiving, resuming from the cursor, or stopped trying. */
function ObservationStatus({ run }: { run: ReturnType<typeof useLiveRun> }) {
  const { observing } = run;
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (observing !== "reconnecting") return;
    // Allow the existing first two retry waits (1 s + 2 s) before announcing recovery.
    const timer = setTimeout(() => setDelayed(true), 3_000);
    return () => clearTimeout(timer);
  }, [observing]);
  return (
    <>
      {(observing === "live" || observing === "reconnecting") && (
        <p role="status" className={styles.muted}>
          {observing === "reconnecting" && delayed
            ? "Updates are delayed. Reconnecting from the last received update…"
            : "Waiting for Meri updates."}
        </p>
      )}
      {observing === "stalled" && (
        <div className={styles.statusRow}>
          <p role="status" className={styles.muted}>
            Updates stopped arriving. The current run status is unknown. Refresh
            to check its current status.
          </p>
        </div>
      )}
    </>
  );
}
