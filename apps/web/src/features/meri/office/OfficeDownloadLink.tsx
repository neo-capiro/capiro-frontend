import { useEffect, useRef, useState } from "react";
import { Button } from "@capiro/ui/button";
import { DocumentDownloadUrl } from "../files/download-url";
import type { OfficeBrowserPort } from "../../../shared/meri-office/file-access";
import styles from "./office.module.css";

/** Mounted only within one current native session; cleanup revokes verified bytes. */
export function OfficeDownloadLink({
  port,
  versionId,
}: {
  port: OfficeBrowserPort;
  versionId: string;
}) {
  const [urls] = useState(() => new DocumentDownloadUrl());
  const pending = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false),
    [problem, setProblem] = useState(false);
  const [file, setFile] = useState<{ filename: string; url: string } | null>(
    null,
  );
  useEffect(
    () => () => {
      pending.current?.abort();
      urls.clear();
    },
    [urls],
  );
  const verify = async () => {
    if (busy) return;
    const request = new AbortController();
    pending.current = request;
    setBusy(true);
    setProblem(false);
    setFile(null);
    urls.clear();
    try {
      const result = await port.download(versionId, request.signal);
      request.signal.throwIfAborted();
      const url = urls.replace(
        new Blob([result.bytes], { type: result.mimeType }),
      );
      setFile({ filename: result.filename, url });
    } catch {
      if (!request.signal.aborted) setProblem(true);
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className={styles.controls}>
      <Button variant="outline" disabled={busy} onClick={() => void verify()}>
        {busy ? "Verifying file…" : "Verify file download"}
      </Button>
      {file && (
        <a href={file.url} download={file.filename}>
          Download {file.filename}
        </a>
      )}
      {problem && (
        <p role="status">The current file download could not be verified.</p>
      )}
    </div>
  );
}
