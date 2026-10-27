"use client";
import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { useApi } from "@/shared/portfolio/api/provider";
import { signedUrl, type Attachment } from "@/features/portfolio/files/public";
import { type ApiClient } from "@/shared/portfolio/api/http";
import { guardedMailApi, useMailAuthority } from "../email/authority";
import { attachmentRefusal } from "../email/attachments";
import {
  readIncomingFiles,
  importIncomingFile,
  readImportedFile,
  type IncomingOriginal,
  type IncomingReceipt,
  type IncomingManifest,
  type IncomingFile,
} from "../email/incoming-files";
import { MailCompose } from "../MailCompose";

// Mounted only for the current, selected canonical message. A parent scope/read
// change unmounts this owner; late provider/storage responses cannot reopen it.
export function IncomingMailFiles({
  original,
  clientId,
}: {
  original: IncomingOriginal;
  clientId: string;
}) {
  const api = useApi();
  const authority = useMailAuthority(JSON.stringify(original));
  const lifetime = useRef({
    active: false,
    controller: new AbortController(),
    pending: false,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [manifest, setManifest] = useState<IncomingManifest | null>(null);
  const [handoff, setHandoff] = useState("");
  const [receipts, setReceipts] = useState<Record<string, IncomingReceipt>>({});
  const [stored, setStored] = useState<Record<string, Attachment>>({});
  const [draft, setDraft] = useState<Attachment | null>(null);
  useLayoutEffect(() => {
    const scope = {
      active: true,
      controller: new AbortController(),
      pending: false,
    };
    lifetime.current = scope;
    return () => {
      scope.active = false;
      scope.controller.abort();
    };
  }, []);
  async function run(
    importing: boolean,
    action: (current: ApiClient, signal: AbortSignal) => Promise<() => void>,
  ) {
    const scope = lifetime.current;
    if (!scope.active || scope.pending) return;
    scope.pending = true;
    setPending(true);
    setError("");
    try {
      const assert = authority.capture();
      const commit = await action(
        guardedMailApi(api, assert),
        scope.controller.signal,
      );
      assert();
      if (scope.active) commit();
    } catch (reason) {
      if (scope.active)
        setError(
          `${reason instanceof Error ? reason.message : "The file request failed."}${importing ? " Import was not confirmed; a private file may already have been stored. Refresh this original and check again. No email was sent." : ""}`,
        );
    } finally {
      scope.pending = false;
      if (scope.active) setPending(false);
    }
  }
  function load() {
    void run(false, async (current, signal) => {
      const result = await readIncomingFiles(current, original, signal);
      return () => {
        setStored({});
        if (result.state === "mailbox_handoff") {
          setManifest(null);
          setHandoff(result.notice);
        } else {
          if (result.manifestSha256 !== manifest?.manifestSha256)
            setReceipts({});
          setManifest(result);
          setHandoff("");
        }
      };
    });
  }
  function importFile(file: IncomingFile) {
    if (!manifest) return;
    void run(true, async (current, signal) => {
      const result = await importIncomingFile(
        current,
        original,
        manifest,
        file,
        signal,
      );
      return () => {
        if (result.state === "mailbox_handoff") setHandoff(result.notice);
        else
          setReceipts((previous) => ({ ...previous, [file.fileKey]: result }));
      };
    });
  }
  function check(receipt: IncomingReceipt) {
    setStored((previous) => {
      const next = { ...previous };
      delete next[receipt.fileKey];
      return next;
    });
    void run(false, async (current, signal) => {
      const row = await readImportedFile(current, original, receipt, signal);
      return () =>
        setStored((previous) => ({ ...previous, [receipt.fileKey]: row }));
    });
  }
  function allowLink(event: MouseEvent<HTMLAnchorElement>) {
    try {
      authority.capture()();
    } catch {
      event.preventDefault();
      setError(
        "Your mailbox session changed. Refresh this original before opening its files.",
      );
    }
  }
  return (
    <section className="stack" aria-label="Files in selected message">
      <h4>Files in this message</h4>
      <p>
        Check the original mailbox for ordinary attached files up to 3 MiB.
        Import stores a private copy for scanning; it does not forward or send
        the message.
      </p>
      <button
        className="button"
        disabled={pending || !authority.ready}
        onClick={load}
      >
        {manifest ? "Refresh file list" : "Check message files"}
      </button>
      {pending && <p role="status">Checking this original’s files…</p>}
      {error && <p role="alert">{error}</p>}
      {handoff && (
        <p role="note">
          {handoff} Open the original in your connected mailbox to handle these
          files.
        </p>
      )}
      {manifest && (
        <>
          <small>{manifest.notice}</small>
          {manifest.files.length === 0 && (
            <p>No attached files were reported in this verified original.</p>
          )}
          <ul>
            {manifest.files.map((file) => {
              const receipt = receipts[file.fileKey],
                row = stored[file.fileKey];
              const download =
                row?.usable === true ? signedUrl(row.downloadUrl) : null;
              const preview =
                row?.usable === true ? signedUrl(row.previewUrl) : null;
              return (
                <li key={file.fileKey} className="stack">
                  <strong>{file.name}</strong>
                  <small>
                    {file.contentType} · {file.bytes.toLocaleString()} bytes
                  </small>
                  {file.status === "mailbox_handoff" ? (
                    <p>
                      {file.reason === "file_too_large"
                        ? "This file exceeds the 3 MiB import limit. "
                        : "This file cannot be imported here. "}
                      Handle it in your connected mailbox. Inline images,
                      embedded items and unsupported files are not imported.
                    </p>
                  ) : !receipt ? (
                    <button
                      className="button"
                      disabled={pending || !authority.ready}
                      onClick={() => importFile(file)}
                    >
                      Import private copy of {file.name}
                    </button>
                  ) : (
                    <>
                      <p role="status">
                        Private copy stored.{" "}
                        {row
                          ? row.usable === true
                            ? "Ready after the current file check."
                            : row.lifecycleStatus === "blocked"
                              ? "Blocked by the file safety check."
                              : "Not ready to open. The file is still quarantined or its readiness is unconfirmed."
                          : `Scan: ${receipt.attachment.scanStatus ?? "unverified"}; ${receipt.attachment.lifecycleStatus}. Check status before opening.`}
                      </p>
                      <small>{row?.scanDisclosure ?? receipt.notice}</small>
                      <button
                        className="button"
                        disabled={pending || !authority.ready}
                        onClick={() => check(receipt)}
                      >
                        Check file status: {file.name}
                      </button>
                      {authority.ready && !pending && download && (
                        <a
                          href={download}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={allowLink}
                        >
                          Download {file.name}
                        </a>
                      )}
                      {authority.ready && !pending && preview && (
                        <a
                          href={preview}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={allowLink}
                        >
                          Preview {file.name}
                        </a>
                      )}
                      {row &&
                        row.clientId === clientId &&
                        !attachmentRefusal(row) && (
                          <button
                            className="button"
                            disabled={pending || !authority.ready}
                            onClick={() => {
                              try {
                                authority.capture()();
                                setDraft(row);
                              } catch {
                                setError(
                                  "Refresh this original before preparing a new email.",
                                );
                              }
                            }}
                          >
                            Prepare new email with {file.name}
                          </button>
                        )}
                      <details>
                        <summary>Imported file provenance</summary>
                        <div style={{ overflowWrap: "anywhere" }}>
                          <p>Original message: {receipt.original.messageId}</p>
                          <p>Original revision: {receipt.original.updatedAt}</p>
                          <p>Private file: {receipt.attachment.id}</p>
                          <p>SHA-256: {receipt.attachment.sha256}</p>
                          <p>Import provenance: {receipt.provenanceSha256}</p>
                        </div>
                      </details>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <small>
        Use your connected mailbox for full native forwarding with original
        attachments. A new email requires separate recipient review and send
        confirmation.
      </small>
      {draft && (
        <MailCompose
          clientId={clientId}
          person={{ name: "New email recipients", email: null, title: null }}
          initialDraft={{
            to: [],
            subject: `File: ${draft.fileName}`,
            attachments: [{ id: draft.id, fileName: draft.fileName }],
          }}
          onClose={() => setDraft(null)}
        />
      )}
    </section>
  );
}
