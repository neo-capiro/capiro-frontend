import { ActionButton } from "@/shared/module-ui";
import type { useBriefCopyCommand } from "./useBriefCopyCommand";
export function CopyRecovery({
  command,
}: {
  command: ReturnType<typeof useBriefCopyCommand>;
}) {
  return (
    <div className="stack">
      {command.error && <p role="alert">{command.error}</p>}
      {command.message && <p role="status">{command.message}</p>}
      {command.record && (
        <>
          <p role="status">
            {command.record.stateConflict
              ? "The exact command was refused because current Workspace content changed. Its proposed input is retained for review."
              : command.record.receipt
                ? "The original version receipt is retained. A fresh authorized current read is required before another save."
                : "The submitted result is not confirmed. Its exact request and input are retained; no automatic retry or new request will run."}
          </p>
          <p>Retained request: {command.record.command.body.requestId}</p>
          {command.record.stateConflict ? (
            <ActionButton
              disabled={command.pending}
              onClick={() => void command.reviewConflict()}
            >
              Review current state and retire refused request
            </ActionButton>
          ) : (
            <ActionButton
              disabled={command.pending}
              onClick={() => void command.retryExact()}
            >
              {command.record.receipt
                ? "Read current after saved receipt"
                : "Retry exact retained command"}
            </ActionButton>
          )}
        </>
      )}
      <ActionButton
        disabled={command.pending}
        onClick={() => void command.readCurrent()}
      >
        Read current copied document
      </ActionButton>
    </div>
  );
}
