"use client";
import { useRef, useState, useLayoutEffect } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  assertClientWriter,
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { signedUrl } from "./contracts";
import {
  deleteProspectFile,
  readProspectFiles,
  type ProspectAttachment,
} from "./prospect-files";
import { useProspectUpload } from "./useProspectUpload";

export function ProspectFiles({
  prospectId,
  available,
  active,
}: {
  prospectId: string;
  available: boolean;
  active: boolean;
}) {
  useIdentity();
  const cache = useQueryClient();
  const actor = currentClientWriter(cache);
  const valid =
    actor &&
    z.uuid().safeParse(actor.tenantId).success &&
    z.uuid().safeParse(actor.userId).success;
  return (
    <section className="card stack" aria-label="Prospect files">
      <h2>Files</h2>
      <p>Files retain this prospect as their origin after conversion.</p>
      {available && valid ? (
        <ProspectFileSession
          key={`${actor.tenantId}:${actor.userId}:${prospectId}`}
          prospectId={prospectId}
          actor={actor}
          active={active}
        />
      ) : (
        <p role="status">
          Prospect files require current prospect access and an active member
          session.
        </p>
      )}
      <div className="row">
        <button className="button" disabled>
          Sharing unavailable
        </button>
        <button className="button" disabled>
          Sending unavailable
        </button>
        <button className="button" disabled>
          Text import unavailable
        </button>
      </div>
      <small>
        These files cannot be copied into client libraries, Outreach, Meri or
        generation workflows.
      </small>
    </section>
  );
}
function ProspectFileSession({
  prospectId,
  actor,
  active,
}: {
  prospectId: string;
  actor: ClientWriter;
  active: boolean;
}) {
  const api = useApi();
  const cache = useQueryClient();
  const queryKey = ["prospect-files", actor.tenantId, actor.userId, prospectId];
  const query = useQuery({
    queryKey,
    retry: false,
    refetchOnMount: "always",
    queryFn: ({ signal }) =>
      readProspectFiles(api, prospectId, actor, signal, () =>
        assertClientWriter(cache, actor),
      ),
  });
  const [selected, setSelected] = useState<File>();
  const [removing, setRemoving] = useState<ProspectAttachment | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, []);
  const upload = useProspectUpload(prospectId, actor, () => {
    setSelected(undefined);
    void query.refetch();
  });
  const current = query.isSuccess && !query.error && !query.isFetching;
  async function remove() {
    if (!removing || !current || request.current || uncertain) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError(null);
    try {
      await deleteProspectFile(
        api,
        prospectId,
        actor,
        removing.id,
        controller.signal,
        () => assertClientWriter(cache, actor),
      );
      if (!alive.current) return;
      setRemoving(null);
      await query.refetch();
    } catch (cause) {
      if (!alive.current || controller.signal.aborted) return;
      setError(
        cause instanceof Error
          ? cause
          : new Error("Deletion could not be confirmed."),
      );
      setUncertain(true);
    } finally {
      if (request.current === controller) request.current = null;
      if (alive.current) setPending(false);
    }
  }
  return (
    <>
      <QueryState
        pending={query.isPending || query.isFetching}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <button
        className="button"
        disabled={pending || upload.busy || query.isFetching}
        onClick={async () => {
          const result = await query.refetch();
          if (result.isSuccess && !result.error) {
            setUncertain(false);
            setRemoving(null);
          }
        }}
      >
        Refresh files
      </button>
      {current && (
        <ul className="stack">
          {query.data.map((file) => (
            <li key={file.id} className="stack">
              <strong>{file.fileName}</strong>
              <small>
                {file.usable === true
                  ? "Ready"
                  : (file.blockedReason ?? file.lifecycleStatus)}{" "}
                · {file.uploadedByName ?? "Uploader unavailable"}
              </small>
              {file.scanDisclosure && <small>{file.scanDisclosure}</small>}
              <div className="row">
                {file.usable === true && signedUrl(file.previewUrl) && (
                  <a
                    className="button"
                    href={signedUrl(file.previewUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview {file.fileName}
                  </a>
                )}
                {file.usable === true && signedUrl(file.downloadUrl) && (
                  <a
                    className="button"
                    href={signedUrl(file.downloadUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download {file.fileName}
                  </a>
                )}
                <button
                  className="button"
                  disabled={pending || upload.busy || uncertain}
                  onClick={() => setRemoving(file)}
                >
                  Delete {file.fileName}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {current && !query.data.length && (
        <p>No files are available for this prospect.</p>
      )}
      <small>
        Preview and download links expire after five minutes. Refresh Files to
        request current links.
      </small>
      {active && !upload.attempt && (
        <label>
          Upload prospect file
          <input
            type="file"
            disabled={!current || upload.busy}
            onChange={(event) => setSelected(event.target.files?.[0])}
          />
        </label>
      )}
      {!active && (
        <p>New files are unavailable for this prospect’s current status.</p>
      )}
      {upload.attempt && (
        <p role="status">
          Original upload retained: {upload.attempt.file.name}. Recovery reuses
          its request and storage key; another copy will not be uploaded
          automatically.
        </p>
      )}
      <button
        className="button"
        disabled={
          !current || upload.busy || (!upload.attempt && (!active || !selected))
        }
        onClick={() => void upload.run(selected)}
      >
        {upload.busy
          ? "Uploading…"
          : upload.attempt
            ? "Recover original upload"
            : "Upload file"}
      </button>
      {upload.stage && <p role="status">{upload.stage}</p>}
      <QueryState error={upload.error ?? error} />
      {uncertain && (
        <p role="status">
          Deletion is not confirmed. Refresh the current file list before
          another action.
        </p>
      )}
      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
        title="Delete prospect file?"
        description={`Remove ${removing?.fileName ?? "this file"}? This does not create a replacement or move the file to a client library.`}
      >
        <button
          className="button danger"
          disabled={pending || uncertain || !current}
          onClick={() => void remove()}
        >
          {pending ? "Deleting…" : "Confirm delete"}
        </button>
        <QueryState error={error} />
      </Dialog>
    </>
  );
}
