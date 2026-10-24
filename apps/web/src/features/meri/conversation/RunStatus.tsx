import { Button } from "@capiro/ui/button";
import { useEffect, useState } from "react";
import type { useLiveRun } from "./useLiveRun";
import { isTerminal, type TurnView } from "./conversation-view";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import ui from "../ui/meri-ui.module.css";
import { StatusPill, type StatusTone } from "../ui/StatusPill";
import styles from "./live.module.css";
import { RunLifecycleControls } from "./lifecycle/RunLifecycleControls";
import { matchesStoredRequest } from "./run-commands";

/** Connection, delivery and stop feedback for the current run; never a run outcome by itself. */
export function RunStatus({
  run,
  active,
  acceptedRequest,
  savedCurrent,
}: {
  run: ReturnType<typeof useLiveRun>;
  /** The run has not reached a terminal status. */
  active: boolean;
  acceptedRequest?: ConversationStoredRequest | undefined;
  /** The current run projected from admitted saved history, never the live stream. */
  savedCurrent?: TurnView | undefined;
}) {
  const { snapshot, intent, busy } = run;
  const uncertain = intent.submit?.state === "unknown";
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
      <StopStatus run={run} savedCurrent={savedCurrent} />
      {active && (
        <p className={styles.muted}>
          Leaving this page stops watching and does not cancel the run. Use Stop
          to request cancellation.
        </p>
      )}
      <RunLifecycleControls />
    </>
  );
}

/** Receipt state is evidence of the outcome at Stop; it never proves physical cleanup. */
function stopFeedback(
  run: ReturnType<typeof useLiveRun>,
  savedCurrent: TurnView | undefined,
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
  if (savedCurrent?.runState === "cancelled")
    return {
      title: "Stopped",
      tone: "success",
      status: "Complete",
      message: "Stopped. Completed steps remain recorded.",
    };
  if (isTerminal(savedCurrent?.runState)) return null;
  if (receipt === "cancelled")
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
  savedCurrent,
}: {
  run: ReturnType<typeof useLiveRun>;
  savedCurrent: TurnView | undefined;
}) {
  const feedback = stopFeedback(run, savedCurrent);
  if (!feedback) return null;
  const retry =
    run.intent.cancel === "unknown" &&
    !run.snapshot.cancelReceipt &&
    !isTerminal(savedCurrent?.runState);
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
