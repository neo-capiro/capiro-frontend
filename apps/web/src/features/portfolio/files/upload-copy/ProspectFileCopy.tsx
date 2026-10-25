"use client";
import { useState } from "react";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { ProspectAttachment } from "../prospect-files";
import { selectProspectUpload } from "./review";
import { useProspectFileCopy } from "./useProspectFileCopy";
import { CopyResult } from "./CopyResult";

export function ProspectFileCopy({
  actor,
  prospectId,
  clientId,
  files,
}: {
  actor: ClientWriter;
  prospectId: string;
  clientId: string;
  files: ProspectAttachment[] | undefined;
}) {
  const flow = useProspectFileCopy(actor, prospectId, clientId);
  const [selected, setSelected] = useState(""),
    [open, setOpen] = useState(false);
  const [folder, setFolder] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const pending = flow.recovery.record,
    busy = flow.action.isPending || flow.review.isPending;
  const ready = flow.recovery.ready && !flow.contextError;
  const review =
    !flow.review.isPending && !flow.review.error ? flow.review.data : undefined;
  const receipt =
    pending && flow.action.data?.requestId === pending.command.requestId
      ? flow.action.data
      : undefined;
  const eligible = (files ?? []).filter((file) => {
    try {
      selectProspectUpload(file);
      return true;
    } catch {
      return false;
    }
  });
  const error =
    flow.contextError ??
    flow.recovery.error ??
    flow.action.error?.message ??
    flow.review.error?.message;
  const startReview = () => {
    const file = eligible.find((row) => row.id === selected);
    if (!file || !ready || pending || busy) return;
    setOpen(true);
    setConfirmed(false);
    flow.action.reset();
    flow.review.reset();
    flow.review.mutate(selectProspectUpload(file));
  };
  return (
    <div className="stack">
      <h3>Private client copy</h3>
      <p>
        After conversion, copy one reviewed upload to the linked client. Each
        copy is restricted to you; the prospect original stays unchanged.
      </p>
      {!pending && ready && (
        <div className="row">
          <label>
            Upload to copy{" "}
            <select
              aria-label="Upload to copy"
              value={selected}
              disabled={busy || !files}
              onChange={(event) => {
                setSelected(event.target.value);
                setConfirmed(false);
                flow.review.reset();
              }}
            >
              <option value="">Choose a ready upload</option>
              {eligible.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.fileName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button"
            disabled={busy || !eligible.some((file) => file.id === selected)}
            onClick={startReview}
          >
            Review private client copy
          </button>
        </div>
      )}
      {pending && ready && (
        <button
          className="button"
          disabled={busy}
          onClick={() => {
            setOpen(true);
            setConfirmed(false);
          }}
        >
          Recover private client file copy
        </button>
      )}
      {!ready && (
        <p role={error ? "alert" : "status"}>
          {error ?? "Checking saved file-copy recovery…"}
        </p>
      )}
      {flow.recovery.error && (
        <button className="button" onClick={flow.recovery.retry}>
          Restore file-copy recovery
        </button>
      )}
      {open && (
        <Dialog
          open
          title={
            pending
              ? "Recover private client file copy"
              : "Review private client file copy"
          }
          description="Review the selected upload and linked client. No sharing, sending or indexing is added."
          onOpenChange={(value) => {
            if (!busy) setOpen(value);
          }}
        >
          <div className="stack">
            {error && <p role="alert">{error}</p>}
            {!ready ? null : pending ? (
              <>
                <p>
                  Upload: <strong>{pending.fileName}</strong>
                </p>
                <p>
                  Client: <strong>{pending.clientName}</strong>
                </p>
                <p>
                  Folder: {pending.command.folder ?? "Root"} ·{" "}
                  {pending.command.contentLength} bytes · revision{" "}
                  {pending.command.expectedRevision}
                </p>
                {receipt && <CopyResult receipt={receipt} />}
                {receipt?.status === "completed" ? (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      flow.action.mutate(
                        { kind: "acknowledge", expected: pending },
                        {
                          onSuccess: () => {
                            setOpen(false);
                            setConfirmed(false);
                            setSelected("");
                            flow.review.reset();
                          },
                        },
                      )
                    }
                  >
                    Acknowledge copy result
                  </button>
                ) : (
                  <>
                    <p>
                      The original command is saved across reloads. A missing
                      receipt does not confirm completion.
                    </p>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate({ kind: "check", expected: pending })
                      }
                    >
                      Check original file copy
                    </button>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        flow.action.mutate({ kind: "retry", expected: pending })
                      }
                    >
                      Retry the same reviewed file copy
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                {flow.review.isPending && (
                  <p role="status">
                    Checking current upload and linked client…
                  </p>
                )}
                {review && (
                  <>
                    <p>
                      Upload: <strong>{review.selection.fileName}</strong> ·{" "}
                      {review.selection.contentLength} bytes · revision{" "}
                      {review.selection.expectedRevision}
                    </p>
                    <p>
                      Client: <strong>{review.client.name}</strong>
                    </p>
                    <label>
                      Destination folder (optional)
                      <input
                        value={folder}
                        maxLength={120}
                        disabled={busy}
                        onChange={(event) => {
                          setFolder(event.target.value);
                          setConfirmed(false);
                        }}
                      />
                    </label>
                  </>
                )}
                <button
                  className="button"
                  disabled={busy || !files}
                  onClick={startReview}
                >
                  Refresh upload review
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={busy || !review}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />{" "}
                  I reviewed this upload, linked client and private destination.
                </label>
                <button
                  className="button primary"
                  disabled={busy || !review || !confirmed}
                  onClick={() => {
                    if (review && confirmed)
                      flow.action.mutate({
                        kind: "submit",
                        review,
                        folder: folder.trim() || null,
                      });
                  }}
                >
                  Copy reviewed upload privately
                </button>
              </>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
