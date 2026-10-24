"use client";
import type { useActivityCommand } from "./useActivityCommand";
import type { CommandUndoSnapshot } from "./command-undo";

export function ActivityCommandStatus({
  command,
  onDone,
}: {
  command: ReturnType<typeof useActivityCommand>;
  onDone: (undo?: CommandUndoSnapshot) => void;
}) {
  const pending = command.pending;
  if (!pending)
    return command.error ? <p role="alert">{command.error}</p> : null;
  const receipt = pending.receipt;
  return (
    <section
      className="stack"
      aria-label={
        pending.input.followUp
          ? "Activity and follow-up result"
          : "Activity command result"
      }
    >
      <p>
        Retained activity: <strong>{pending.input.activity.title}</strong>
      </p>
      <p>
        Request: <code>{pending.input.requestId}</code>
      </p>
      {command.error && <p role="alert">{command.error}</p>}
      {receipt ? (
        <>
          <p role="status">
            {receipt.activity.available
              ? "Activity saved."
              : "The original activity is unavailable; it will not be recreated."}
          </p>
          {pending.input.followUp && (
            <p>
              {receipt.followUp?.state === "completed"
                ? `Follow-up created. Task: ${receipt.followUp.taskId}`
                : receipt.followUp?.state === "unavailable"
                  ? "The follow-up task is currently unavailable. No replacement will be created automatically."
                  : "Follow-up is pending; task creation is not confirmed."}
            </p>
          )}
          {receipt.reason && (
            <p>
              Needs attention: {receipt.reason.replaceAll("_", " ")}. Resolve
              this condition and read the command before resuming.
            </p>
          )}
          {receipt.status === "in_progress" && (
            <p>An attempt is in progress. Wait and read the command again.</p>
          )}
        </>
      ) : command.busy ? (
        <p role="status">Checking the original activity command…</p>
      ) : (
        <p role="status">
          The save result is not confirmed. The original request is retained.
          Read it before recovery; an unavailable receipt does not mean nothing
          was saved.
        </p>
      )}
      <div className="formActions">
        <button
          type="button"
          className="button"
          disabled={command.busy || !command.ready}
          onClick={() => void command.refresh()}
        >
          Read saved command
        </button>
        {!receipt && pending.readAttempted && (
          <button
            type="button"
            className="button"
            disabled={command.busy || !command.ready}
            onClick={() => void command.recover()}
          >
            Recover original save
          </button>
        )}
        {receipt && pending.input.followUp && !command.complete && (
          <button
            type="button"
            className="button"
            disabled={command.busy || !command.ready || !command.canResume}
            onClick={() => void command.resume()}
          >
            Resume follow-up
          </button>
        )}
        {command.complete && (
          <button
            type="button"
            className="button primary"
            disabled={command.busy}
            onClick={async () => {
              const result = await command.finish();
              if (result.acknowledged)
                onDone("undo" in result ? result.undo : undefined);
            }}
          >
            Done
          </button>
        )}
      </div>
    </section>
  );
}
