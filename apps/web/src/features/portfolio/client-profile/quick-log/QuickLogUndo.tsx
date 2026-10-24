"use client";
import type { UndoAttempt } from "./command-undo";
import type { useQuickLogUndo } from "./useQuickLogUndo";
import styles from "./quick-log.module.css";

export function QuickLogUndo({
  receipt,
  clientName,
  recovery,
  onDismiss,
}: {
  receipt: UndoAttempt["snapshot"];
  clientName: string;
  recovery: ReturnType<typeof useQuickLogUndo>;
  onDismiss: () => void;
}) {
  const pending = Boolean(recovery.attempt);
  const removed = recovery.result?.status === "removed";
  return (
    <aside className={styles.toast} aria-label="Quick log result">
      <span aria-hidden="true">✓</span>
      <div>
        <p role="status">
          {removed
            ? "Quick log removed"
            : pending
              ? "Undo awaiting confirmation"
              : `Logged to ${clientName}`}
        </p>
        <small>
          {removed
            ? "Only this recorded activity was removed."
            : pending
              ? "The original Undo is retained for recovery."
              : "Recorded activity on the timeline"}
        </small>
        {recovery.error && <p role="alert">{recovery.error}</p>}
        {pending && !removed && (
          <p>
            Read the saved Undo to check its result. Retrying sends only the
            original attempt.
          </p>
        )}
      </div>
      <a href={`/portfolio/${receipt.clientId}#activity-timeline`}>View</a>
      {pending && !removed && (
        <button
          disabled={recovery.busy}
          onClick={() => void recovery.run("read")}
        >
          Read saved Undo
        </button>
      )}
      {!removed && (
        <button
          disabled={!recovery.ready || recovery.busy}
          onClick={() => void recovery.run("send", receipt)}
        >
          {recovery.busy
            ? "Checking Undo…"
            : pending
              ? "Retry original Undo"
              : "Undo"}
        </button>
      )}
      {(!pending || removed) && (
        <button
          aria-label="Dismiss Quick log result"
          disabled={recovery.busy}
          onClick={async () => {
            if (!pending || (await recovery.run("acknowledge"))) onDismiss();
          }}
        >
          ×
        </button>
      )}
    </aside>
  );
}
