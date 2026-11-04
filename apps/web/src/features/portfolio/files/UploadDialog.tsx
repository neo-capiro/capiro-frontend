"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { uploadParentFile, type UploadAttempt } from "./upload";
import { fileValidation } from "./contracts";
import { currentFilesKey, filesKey } from "./file-reader";
import { useFileScope, type FileExecution } from "./file-scope";
import styles from "./file-dialog.module.css";
type Job = {
  id: string;
  file: File;
  stage: string;
  error?: string;
  complete?: boolean;
};
type UploadDialogProps = {
  clientId: string;
  onClose: () => void;
  source?: string;
  folder?: string | null;
  folderNames?: string[];
  beforeDispatch?: () => void;
};

export function UploadDialog(props: UploadDialogProps) {
  const scope = useFileScope(props.clientId, props.source ?? "manual");
  return <UploadFiles key={scope.key} {...props} scope={scope} />;
}

function UploadFiles({
  clientId,
  onClose,
  source = "manual",
  folder = null,
  folderNames,
  beforeDispatch,
  scope,
}: UploadDialogProps & { scope: ReturnType<typeof useFileScope> }) {
  const api = useApi();
  const cache = useQueryClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [destination, setDestination] = useState(folder ?? "");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const attempts = useRef(
    new Map<
      string,
      { attempt: UploadAttempt; execution: FileExecution; guard: () => void }
    >(),
  );
  const patch = (id: string, update: Partial<Job>) =>
    setJobs((jobs) =>
      jobs.map((job) => (job.id === id ? { ...job, ...update } : job)),
    );
  async function run(job: Job) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    let captured = attempts.current.get(job.id);
    try {
      if (!captured) {
        const execution = scope.capture(true);
        // Preserve the initiating parent hook and actor for every retry of this job.
        const guard = () => {
          execution.guard();
          beforeDispatch?.();
        };
        captured = { execution, guard, attempt: { actor: execution.actor } };
        attempts.current.set(job.id, captured);
      }
      const { execution, attempt, guard } = captured;
      execution.signal.throwIfAborted();
      guard();
      patch(job.id, { error: undefined });
      await uploadParentFile(
        api,
        { clientId, folder: destination || null },
        job.file,
        attempt,
        (stage) => {
          guard();
          patch(job.id, { stage });
        },
        source,
        fetch,
        guard,
      );
      guard();
      await Promise.all([
        cache.invalidateQueries({
          queryKey: currentFilesKey(cache, clientId),
          exact: true,
        }),
        cache.invalidateQueries({
          queryKey: [...filesKey(clientId), "storage-usage"],
        }),
      ]);
      guard();
      patch(job.id, {
        complete: true,
        stage: "Uploaded · awaiting service processing",
      });
      attempts.current.delete(job.id);
    } catch (error) {
      if (captured?.execution.signal.aborted) return;
      patch(job.id, {
        error: error instanceof Error ? error.message : "Upload failed.",
        stage: "Failed",
      });
    } finally {
      lock.current = false;
      if (!captured?.execution.signal.aborted) setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title="Upload files"
      description="Files will be saved in the destination you choose."
      className={styles.dialog}
    >
      <div className={styles.body}>
        <label>
          Destination folder
          <select
            value={destination}
            disabled={busy || jobs.some((job) => job.stage !== "Ready")}
            onChange={(event) => setDestination(event.target.value)}
          >
            <option value="">Unfiled</option>
            {[
              ...new Set([...(folderNames ?? []), ...(folder ? [folder] : [])]),
            ].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <small>
          Choose files to upload into {destination || "Unfiled"}. Up to 25 MiB
          per file.
        </small>
        {!scope.canWrite && (
          <p role="status">
            Uploads are unavailable in this view. Close this dialog and refresh
            the client files.
          </p>
        )}
        <input
          ref={fileInput}
          className="srOnly"
          aria-label="Select files"
          tabIndex={-1}
          type="file"
          multiple
          disabled={busy || !scope.canWrite}
          onChange={(event) =>
            setJobs((jobs) => [
              ...jobs,
              ...Array.from(event.target.files ?? []).map((file) => ({
                id: crypto.randomUUID(),
                file,
                stage: "Ready",
                error: fileValidation(file) ?? undefined,
              })),
            ])
          }
        />
        {jobs.map((job) => (
          <article className="card stack" key={job.id}>
            <strong>{job.file.name}</strong>
            <small role="status">{job.stage}</small>
            {job.error && <p role="alert">{job.error}</p>}
            {!job.complete && (
              <button
                className="button"
                disabled={
                  busy || !scope.canWrite || Boolean(fileValidation(job.file))
                }
                onClick={() => void run(job)}
              >
                {job.stage === "Failed" ? "Retry file" : "Upload file"}
              </button>
            )}
          </article>
        ))}
      </div>
      <footer className={styles.footer}>
        <button className="button" disabled={busy} onClick={onClose}>
          {jobs.length ? "Done" : "Cancel"}
        </button>
        <button
          className="button primary"
          disabled={busy || !scope.canWrite}
          onClick={() => fileInput.current?.click()}
        >
          Choose files
        </button>
      </footer>
    </Dialog>
  );
}
