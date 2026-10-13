"use client";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useState } from "react";
import { useFileDeletion } from "./useFileDeletion";

export function DeleteFile({
  clientId,
  id,
  fileName,
  onClose,
}: {
  clientId: string;
  id: string;
  fileName?: string;
  onClose: () => void;
}) {
  // The name lives only in this reader-scoped dialog; changing scope unmounts it.
  const [name] = useState(fileName ?? "this file");
  const deletion = useFileDeletion(clientId, id, onClose);
  return (
    <Dialog
      open
      title="Delete file"
      description={`Delete ${name}? This removes the attachment and its stored object.`}
      onOpenChange={(open) => {
        if (!open && !deletion.isPending) onClose();
      }}
    >
      <div className="stack">
        <QueryState error={deletion.error} />
        {deletion.attempt?.status === "unknown" && (
          <>
            <p role="alert">
              The deletion outcome is unknown. Review current files before
              deciding whether to confirm deletion again.
            </p>
            <button
              className="button"
              disabled={!deletion.canReview}
              onClick={deletion.review}
            >
              Review current files
            </button>
          </>
        )}
        {deletion.current && (
          <div className="stack" role="status">
            {deletion.current.file ? (
              <>
                <p>Current file: {deletion.current.file.fileName}.</p>
                <p>
                  Current deletion status:{" "}
                  {deletion.current.file.lifecycleStatus === "delete_pending"
                    ? "Pending"
                    : deletion.current.file.lifecycleStatus === "delete_failed"
                      ? "Failed"
                      : "No pending deletion reported"}
                  .
                </p>
                {deletion.current.file.lifecycleStatus === "delete_pending" && (
                  <p>
                    Deletion is still pending. Review again before a new
                    confirmation.
                  </p>
                )}
              </>
            ) : (
              <p>
                This file is not in the current visible client files. It may
                have been deleted, superseded, or become unavailable.
              </p>
            )}
            <small>
              This is current visible state. It does not confirm the earlier
              deletion.
            </small>
          </div>
        )}
        <button
          className="button primary"
          disabled={deletion.blocked}
          onClick={deletion.remove}
        >
          Confirm delete
        </button>
      </div>
    </Dialog>
  );
}
