"use client";
import { useEffect, useState } from "react";
import type { DocumentVersion } from "@capiro/meri-client/document-access";
import { ActionButton } from "../../../../shared/module-ui";
import type { OfficeBrowserPort } from "../../../../shared/meri-office/file-access";
import styles from "./office-workspace.module.css";

type Entry = Readonly<DocumentVersion>;
type Reading = Readonly<{
  key: string;
  versions?: readonly Entry[];
  problem?: string;
}>;
const when = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString()
    : "time unavailable";
};

/** The immutable revisions of the opened document (newest first), read from the same history the library shows.
 * Each row names its position in the lineage; opening a row reopens the Workspace on that revision. */
export function OfficeRevisionHistory({
  port,
  versionId,
  refreshKey,
  onOpen,
}: {
  port: OfficeBrowserPort;
  /** The revision this screen opened. */
  versionId: string;
  /** Changes after a publication, so the list reads again. */
  refreshKey: string;
  onOpen(versionId: string): void;
}) {
  const key = `${versionId}:${refreshKey}`;
  const [reading, setReading] = useState<Reading | null>(null);
  const current = reading?.key === key ? reading : null;
  useEffect(() => {
    const request = new AbortController();
    void (async () => {
      try {
        const reply = await port.history(versionId, request.signal);
        if (request.signal.aborted) return;
        if (!reply.ok) throw new Error(reply.code);
        setReading({ key, versions: reply.value.versions });
      } catch {
        if (!request.signal.aborted)
          setReading({
            key,
            problem: "The revision history could not be read right now.",
          });
      }
    })();
    return () => request.abort();
  }, [port, versionId, key]);
  const versions = current?.versions;
  return (
    <aside className={styles.history} aria-label="Revision history">
      <h2>Revisions</h2>
      <p className={styles.muted}>
        Every published revision of this document is immutable. Open one to read
        or revise it; a revision you publish continues the same document.
      </p>
      {current?.problem && <p role="alert">{current.problem}</p>}
      {!current && <p role="status">Reading history…</p>}
      {versions && (
        <ol className={styles.revisions}>
          {versions.map((version, index) => {
            const number = versions.length - index;
            const open = version.versionId === versionId;
            return (
              <li key={version.versionId} aria-current={open || undefined}>
                <div>
                  <strong>
                    Revision {number}
                    {version.parentVersionId === null ? " (original)" : ""}
                    {open ? " · open" : ""}
                  </strong>
                  <p className={styles.muted}>
                    {version.filename} · {when(version.createdAt)}
                  </p>
                </div>
                {!open && (
                  <ActionButton onClick={() => onOpen(version.versionId)}>
                    Open
                  </ActionButton>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {versions?.length === 0 && (
        <p className="empty">No revision is available under current access.</p>
      )}
    </aside>
  );
}
