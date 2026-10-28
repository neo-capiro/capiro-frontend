"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@capiro/ui/button";
import { NATIVE_RESULTS_MAX } from "@capiro/meri-client/document-access";
import type {
  ArtifactFile,
  ArtifactPreview,
} from "../../../shared/meri-documents/artifact-access";
import type { DocumentLibraryAccess } from "../../../shared/meri-documents/library-access";
import type { NativeResultsPage } from "../../../shared/meri-documents/native-results-access";
import { DocumentDownloadUrl } from "./download-url";
import styles from "./files.module.css";

type Inspection = { versionId: string; preview: ArtifactPreview };
type Download = { versionId: string; url: string; filename: string };

/**
 * Metadata selectors for the workspace entries of the run already captured for this saved
 * conversation. Reading the page, inspecting an entry and downloading an entry are three separate
 * explicit actions; nothing here starts a conversation, allocates a run or generates a file, and a
 * module or path name in an answer is never treated as markup or as an access grant.
 */
export function NativeResultFiles({ port }: { port: DocumentLibraryAccess }) {
  const [page, setPage] = useState<NativeResultsPage | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [download, setDownload] = useState<Download | null>(null);
  const request = useRef<AbortController | null>(null);
  const urls = useRef(new DocumentDownloadUrl());
  const generation = useRef(0);
  useEffect(
    () => () => {
      // The account, origin or session this component was mounted for is gone: cancel the read in
      // flight and discard the verified bytes and their local URL.
      generation.current += 1;
      request.current?.abort();
      request.current = null;
      urls.current.clear();
    },
    [],
  );
  const live = (at: number, signal: AbortSignal) =>
    generation.current === at && !signal.aborted;
  const start = () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    // Every new explicit action supersedes the last one, so a late answer is never committed.
    generation.current += 1;
    return { at: generation.current, controller };
  };
  const refused = (message: string) => {
    setPage(null);
    setProblem(message);
    setInspection(null);
    urls.current.clear();
    setDownload(null);
  };
  async function read() {
    if (busy) return;
    const { at, controller } = start();
    setPage(null);
    setInspection(null);
    urls.current.clear();
    setDownload(null);
    setBusy(true);
    setProblem(null);
    try {
      const reply = await port.results(controller.signal);
      if (!live(at, controller.signal)) return;
      if (!reply.ok) {
        refused(
          reply.accessDenied
            ? "Current file access is unavailable. Previously read results have been cleared."
            : "The captured run results could not be verified. Nothing was read.",
        );
        return;
      }
      setPage(reply.value);
    } catch {
      if (live(at, controller.signal))
        refused(
          "The captured run results could not be verified. Nothing was read.",
        );
    } finally {
      if (live(at, controller.signal)) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  async function inspect(versionId: string) {
    const { at, controller } = start();
    setInspection(null);
    urls.current.clear();
    setDownload(null);
    setProblem(null);
    try {
      const reply = await port.inspect(versionId, controller.signal);
      if (!live(at, controller.signal)) return;
      if (!reply.ok) {
        refused(
          "Current file details could not be verified. Connect again before continuing.",
        );
        return;
      }
      setInspection({ versionId, preview: reply.value });
    } catch {
      if (live(at, controller.signal))
        refused("Current file details could not be verified.");
    }
  }
  async function save(versionId: string) {
    const { at, controller } = start();
    urls.current.clear();
    setDownload(null);
    setProblem(null);
    try {
      const reply = await port.download(versionId, controller.signal);
      if (!live(at, controller.signal)) return;
      if (!reply.ok) {
        refused(
          "Current download access could not be verified. Connect again before continuing.",
        );
        return;
      }
      const file: ArtifactFile = reply.value;
      setDownload({
        versionId,
        url: urls.current.replace(
          new Blob([file.bytes], { type: file.mimeType }),
        ),
        filename: file.filename,
      });
    } catch {
      if (live(at, controller.signal))
        refused("The download could not be verified.");
    }
  }
  return (
    <section
      className={styles.panel}
      aria-label="Captured run native analysis results"
    >
      <h3>Native analysis results of the captured run</h3>
      <p className={styles.muted}>
        Names of the workspace entries from the run already captured for this
        saved conversation. A name grants nothing by itself: reading or
        downloading one checks current access and retention again. Opening this
        does not start a chat or generate a file.
      </p>
      <div className={styles.controls}>
        <Button variant="outline" disabled={busy} onClick={() => void read()}>
          {busy
            ? "Reading…"
            : page
              ? "Read results again"
              : "Read captured run results"}
        </Button>
      </div>
      {problem && <p role="status">{problem}</p>}
      {page && (
        <NativeResultRows
          page={page}
          busy={busy}
          inspection={inspection}
          download={download}
          onInspect={(versionId) => void inspect(versionId)}
          onDownload={(versionId) => void save(versionId)}
        />
      )}
    </section>
  );
}

/**
 * Pure presentation of one admitted page. It owns no request: an entry name is rendered as text,
 * never as markup, and no page is presented as a complete library.
 */
export function NativeResultRows({
  page,
  busy,
  inspection,
  download,
  onInspect,
  onDownload,
}: {
  page: NativeResultsPage;
  busy: boolean;
  inspection: Inspection | null;
  download: Download | null;
  onInspect: (versionId: string) => void;
  onDownload: (versionId: string) => void;
}) {
  return (
    <>
      <p className={styles.muted}>
        Captured {new Date(page.capturedAt).toLocaleString()} · manifest{" "}
        {page.manifestId.slice(-8)}
      </p>
      {page.results.length === 0 ? (
        <p role="status">
          {page.truncated
            ? "The receiver reached its bound without returning an entry on this page."
            : "The captured run has no workspace entry on this page."}
        </p>
      ) : (
        <ul className={styles.stack}>
          {page.results.map((row) => (
            <li key={row.versionId}>
              <p className={styles.identifier}>{row.path}</p>
              <p className={styles.muted}>
                {row.bytes} bytes · sha256 {row.sha256.slice(0, 16)}…
                {row.executable ? " · executable" : ""}
              </p>
              <div className={styles.controls}>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => onInspect(row.versionId)}
                >
                  Inspect current bytes
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => onDownload(row.versionId)}
                >
                  Verify download
                </Button>
              </div>
              {inspection?.versionId === row.versionId && (
                <p role="status">
                  Current bytes verified for {inspection.preview.filename}. This
                  inspection does not claim a rendered preview.
                </p>
              )}
              {download?.versionId === row.versionId && (
                <a
                  className={styles.download}
                  href={download.url}
                  download={download.filename}
                >
                  Download {download.filename}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.muted}>
        {page.truncated
          ? `This page reached the receiver's own bound of ${NATIVE_RESULTS_MAX} entries, so it is not the whole library: later entries were not returned.`
          : `This is one bounded page (at most ${NATIVE_RESULTS_MAX} entries) of the captured run, not a complete conversation library.`}
      </p>
    </>
  );
}
