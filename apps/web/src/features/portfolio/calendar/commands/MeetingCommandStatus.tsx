"use client";
import type { MeetingRecovery } from "./useMeetingCommand";

export function MeetingCommandStatus({
  command,
  onDone,
}: {
  command: MeetingRecovery;
  onDone?: () => void;
}) {
  const input = command.attempt?.input;
  const run = (kind: "check" | "retry" | "done" | "review") => {
    void command
      .recover(kind)
      .then(() => {
        if (kind === "done") onDone?.();
      })
      .catch(() => {});
  };
  return (
    <div className="stack">
      {!command.ready && <p role="status">Loading saved meeting actions…</p>}
      {command.error && <p role="alert">{command.error}</p>}
      {!command.ready && command.error && (
        <button type="button" className="button" onClick={command.reload}>
          Reload recovery
        </button>
      )}
      {input && (
        <>
          <p role="status">
            {command.receipt?.status === "completed"
              ? `This action completed.${command.receipt.available ? "" : " The saved record is no longer available in its original scope."}`
              : command.receipt?.status === "refused"
                ? command.receipt.refusal?.message
                : "This meeting action is saved for recovery. Check its result or retry the original action before starting another."}
          </p>
          <details>
            <summary>
              Saved action: {input.operation.replaceAll("-", " ")}
            </summary>
            {input.meeting && (
              <p>
                {input.meeting.subject} · {input.meeting.startsAt} –{" "}
                {input.meeting.endsAt}
              </p>
            )}
            {input.artifact?.body && (
              <p style={{ whiteSpace: "pre-wrap" }}>{input.artifact.body}</p>
            )}
            {input.artifacts.length > 0 && (
              <p>{input.artifacts.length} selected artifacts</p>
            )}
          </details>
          <div className="row">
            <button
              type="button"
              className="button"
              disabled={command.busy}
              onClick={() => run("check")}
            >
              Check result
            </button>
            {!command.receipt && (
              <button
                type="button"
                className="button"
                disabled={command.busy}
                onClick={() => run("retry")}
              >
                Retry original action
              </button>
            )}
            {command.receipt?.status === "completed" && (
              <button
                type="button"
                className="button primary"
                disabled={command.busy}
                onClick={() => run("done")}
              >
                Done
              </button>
            )}
            {command.receipt?.status === "refused" && (
              <button
                type="button"
                className="button"
                disabled={command.busy}
                onClick={() => run("review")}
              >
                Review again
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
