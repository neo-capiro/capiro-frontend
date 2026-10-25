"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import type { FileDeletionReview } from "./deletion-review";
import { useFileDeletion } from "./useFileDeletion";

type Props = {
  clientId: string;
  file?: FileDeletionReview;
  onClose: () => void;
};
export function DeleteFile(props: Props) {
  useIdentity();
  const cache = useQueryClient(),
    actor = currentClientWriter(cache);
  return actor ? (
    <DeletionSession
      key={`${actor.tenantId}:${actor.userId}:${props.clientId}`}
      {...props}
      actor={actor}
    />
  ) : null;
}
function DeletionSession({
  clientId,
  file,
  onClose,
  actor,
}: Props & { actor: ClientWriter }) {
  const flow = useFileDeletion(clientId, actor),
    [recovering, setRecovering] = useState(false);
  const pending = flow.recovery.record,
    busy = flow.action.isPending;
  const ready = flow.recovery.ready && !flow.contextError;
  const receipt =
    pending && flow.action.data?.requestId === pending.command.requestId
      ? flow.action.data
      : undefined;
  const error =
    flow.contextError ?? flow.recovery.error ?? flow.action.error?.message;
  const close = () => {
    setRecovering(false);
    onClose();
  };
  return (
    <>
      {pending && ready && (
        <button className="button" onClick={() => setRecovering(true)}>
          Recover saved file deletion
        </button>
      )}
      {flow.recovery.error && (
        <div role="alert">
          <p>{flow.recovery.error}</p>
          <button className="button" onClick={flow.recovery.retry}>
            Restore deletion recovery
          </button>
        </div>
      )}
      {(file || recovering) && (
        <Dialog
          open
          title="Delete file"
          description="Delete the reviewed attachment, its current stored object and indexed text. Versioned storage history is not permanent erasure."
          onOpenChange={(open) => {
            if (!open && !busy) close();
          }}
        >
          <div className="stack">
            {error && <p role="alert">{error}</p>}
            {!ready ? (
              <p role="status">
                Current access and saved deletion recovery are required.
              </p>
            ) : pending ? (
              <>
                <p>
                  Reviewed file: <strong>{pending.fileName}</strong> · revision{" "}
                  {pending.command.expectedRevision}
                </p>
                {receipt?.status === "completed" ? (
                  <>
                    <p role="status">
                      The reviewed attachment, current stored object and indexed
                      text were deleted. This historical result will not
                      recreate the file.
                    </p>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate(
                          { kind: "acknowledge", expected: pending },
                          { onSuccess: close },
                        )
                      }
                    >
                      Acknowledge deletion result
                    </button>
                  </>
                ) : (
                  <>
                    <p role="status">
                      {receipt?.status === "pending"
                        ? "Deletion is pending."
                        : "Deletion is not confirmed."}{" "}
                      The original command is retained across reloads. A missing
                      file or receipt does not prove completion.
                    </p>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate({ kind: "check", expected: pending })
                      }
                    >
                      Check original deletion
                    </button>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate({ kind: "retry", expected: pending })
                      }
                    >
                      Retry the same reviewed deletion
                    </button>
                  </>
                )}
              </>
            ) : file ? (
              <>
                <p>
                  Delete <strong>{file.fileName}</strong> · revision{" "}
                  {file.metadataRevision ?? "unavailable"}?
                </p>
                <button
                  className="button danger"
                  disabled={busy || file.metadataRevision === undefined}
                  onClick={() =>
                    flow.action.mutate({
                      kind: "submit",
                      review: structuredClone(file),
                    })
                  }
                >
                  Confirm delete
                </button>
              </>
            ) : null}
          </div>
        </Dialog>
      )}
    </>
  );
}
