"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { MeriUploadAccess } from "../../../../shared/meri-uploads/access";
import type { SavedUploadOriginal } from "../../../../shared/meri-uploads/current-read";
import { DocumentDownloadUrl } from "../../files/download-url";
import { FieldTable } from "../../ui/FieldTable";
import { StateMessage } from "../../ui/StateMessage";
import { StatusPill } from "../../ui/StatusPill";
import { useCurrentRead } from "./useCurrentRead";
import type { NativeUploadSourceEvent } from "../conversation-view";
import {
  uploadCustodyRows,
  uploadFailure,
  uploadSavedReference,
  uploadSavedRows,
  uploadScanLabel,
  uploadScanTone,
  uploadStorageLabel,
  uploadStorageTone,
} from "./upload-source";
import ui from "../../ui/meri-ui.module.css";
import styles from "./evidence.module.css";

type DownloadStatus =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "failed"; code: string }
  | { kind: "done"; filename: string };

/**
 * One saved uploaded file. The saved event is shown exactly as far as it goes — filename, type,
 * size, the saved original's identity, and the coverage and limits of the one extracted page that
 * was read — and the current state of the file is re-queried only when a person asks for it. The
 * read is never automatic on selection, and a saved reference is never treated as access.
 */
export function UploadSourceView({
  event,
  uploads,
}: {
  event: NativeUploadSourceEvent;
  uploads: MeriUploadAccess;
}) {
  const titleId = useId();
  // The saved event is immutable; this is its reference for the life of this mounted file.
  const [saved] = useState(() => uploadSavedReference(event));
  const [checking, setChecking] = useState(false);
  return (
    <section className={styles.usageSection} aria-labelledby={titleId}>
      <h3 id={titleId}>Uploaded file</h3>
      <FieldTable
        caption="Saved upload reference"
        fieldLabel="Field"
        rows={uploadSavedRows(event)}
      />
      <p>
        This is what the saved record states. The file&rsquo;s extracted text is
        not published to this surface, and this record does not establish that
        the answer used or cited the file.
      </p>
      {checking ? (
        <UploadCustody uploads={uploads} saved={saved} />
      ) : (
        <button
          type="button"
          className={ui.outline}
          onClick={() => setChecking(true)}
        >
          Check current file
        </button>
      )}
    </section>
  );
}

/**
 * The current custody of one saved original, read fresh from the session's upload owner. Extracted
 * text stays unavailable here: the canonical surface publishes the original bytes, not fragments.
 */
function UploadCustody({
  uploads,
  saved,
}: {
  uploads: MeriUploadAccess;
  saved: SavedUploadOriginal;
}) {
  const titleId = useId();
  const currentRead = uploads.current;
  const read = useCallback(
    (signal: AbortSignal) => currentRead.inspect(saved, signal),
    [currentRead, saved],
  );
  const result = useCurrentRead(saved.uploadId, read);
  const reply = result.value;
  const heading = <h4 id={titleId}>Current file</h4>;
  if (result.loading)
    return (
      <section aria-labelledby={titleId}>
        {heading}
        <p role="status">Checking the file&rsquo;s current custody…</p>
      </section>
    );
  if (!reply || !reply.ok) {
    const failure = uploadFailure(reply?.refusal.code ?? "UNAVAILABLE");
    return (
      <section aria-labelledby={titleId}>
        {heading}
        <StateMessage
          title={failure.title}
          status="Unavailable"
          tone="danger"
          announce
          action={
            failure.retry ? (
              <button
                type="button"
                className={ui.outline}
                onClick={result.reload}
              >
                Check again
              </button>
            ) : undefined
          }
        >
          <p>{failure.detail}</p>
        </StateMessage>
      </section>
    );
  }
  const custody = reply.value;
  if (!custody.matchesSaved)
    return (
      <section aria-labelledby={titleId}>
        {heading}
        <StateMessage
          title="The saved file has changed"
          status="Changed"
          tone="danger"
          announce
        >
          <p>
            Current custody no longer carries exactly the original this saved
            reference names, so nothing is shown for it. Nothing was read or
            downloaded.
          </p>
        </StateMessage>
      </section>
    );
  return (
    <section aria-labelledby={titleId}>
      {heading}
      <p>
        <StatusPill tone={uploadStorageTone(custody.storageStatus)}>
          {uploadStorageLabel(custody.storageStatus)}
        </StatusPill>{" "}
        <StatusPill tone={uploadScanTone(custody.scanStatus)}>
          {uploadScanLabel(custody.scanStatus)}
        </StatusPill>
      </p>
      <FieldTable
        caption="Current custody of this saved original"
        fieldLabel="Field"
        rows={uploadCustodyRows(custody)}
      />
      <p role="status">
        Current state is not access: Meri decides on every call whether the
        original may be read.
      </p>
      <UploadOriginalDownload uploads={uploads} saved={saved} />
      <button type="button" className={ui.outline} onClick={result.reload}>
        Check again
      </button>
    </section>
  );
}

/**
 * Exactly one canonical read of the original, and only after a fresh inspect confirmed that current
 * custody still carries it. The bytes are handed over as a local verified download: the download
 * owner never fetches, and nothing is substituted when the read is refused.
 */
function UploadOriginalDownload({
  uploads,
  saved,
}: {
  uploads: MeriUploadAccess;
  saved: SavedUploadOriginal;
}) {
  const [status, setStatus] = useState<DownloadStatus>({ kind: "idle" });
  const work = useRef<AbortController | null>(null);
  const [url] = useState(() => new DocumentDownloadUrl());
  useEffect(
    () => () => {
      work.current?.abort();
      url.clear();
    },
    [url],
  );
  const begin = () => {
    work.current?.abort();
    const controller = new AbortController();
    work.current = controller;
    setStatus({ kind: "working" });
    return controller;
  };
  const download = async () => {
    const controller = begin();
    const reply = await uploads.current.original(saved, controller.signal);
    if (work.current !== controller) return;
    if (!reply.ok) {
      if (reply.refusal.accessDenied) url.clear();
      setStatus({ kind: "failed", code: reply.refusal.code });
      return;
    }
    const link = document.createElement("a");
    link.href = url.replace(
      new Blob([reply.value.bytes], { type: reply.value.mimeType }),
    );
    link.download = reply.value.filename;
    link.rel = "noopener";
    link.click();
    setStatus({ kind: "done", filename: reply.value.filename });
  };
  return (
    <>
      <button
        type="button"
        className={ui.outline}
        disabled={status.kind === "working"}
        onClick={() => void download()}
      >
        {status.kind === "working"
          ? "Reading the original…"
          : "Download the original"}
      </button>
      <p role="status">
        {status.kind === "failed"
          ? `${uploadFailure(status.code).title} (${status.code}). Nothing was substituted.`
          : status.kind === "done"
            ? `Read ${status.filename}; its bytes matched the inspected original.`
            : ""}
      </p>
    </>
  );
}
