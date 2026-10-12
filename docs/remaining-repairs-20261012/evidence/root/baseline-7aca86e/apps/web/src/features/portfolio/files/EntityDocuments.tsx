"use client";
import { useState } from "react";
import { useFiles } from "./queries";
import { UploadDialog } from "./UploadDialog";
import { FilePreview } from "./FilePreview";
import { signedUrl } from "./contracts";
import { useFileNavigation } from "./navigation";
import { DocumentState } from "./DocumentState";
import styles from "./entity-documents.module.css";
// Public shared feature: sub-entity documents use the same attachment pipeline,
// cache, client association and readiness rules as the client's Files page.
export function EntityDocuments({
  clientId,
  source,
  description,
  emptyMessage = "No documents linked to this record.",
}: {
  clientId: string;
  source: string;
  description?: string;
  emptyMessage?: string;
}) {
  const query = useFiles(clientId);
  const navigation = useFileNavigation(clientId, source);
  const view = JSON.stringify([query.readerScope, source]);
  const [selection, setSelection] = useState<{
    view: string;
    upload?: boolean;
    previewId?: string;
  }>();
  const active = selection?.view === view ? selection : undefined;
  const available = query.isSuccess && !query.error;
  const files = available
    ? query.data.filter((file) => file.source === source)
    : undefined;
  const preview = files?.find((file) => file.id === active?.previewId);
  return (
    <section className={styles.documents} aria-label="Documents">
      <div>
        <button
          className={`button ${styles.upload}`}
          disabled={!available || !navigation.canWrite}
          onClick={() => setSelection({ view, upload: true })}
        >
          Upload document
        </button>
      </div>
      {description && <p className={styles.caption}>{description}</p>}
      <DocumentState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {files && files.length > 0 && (
        <ul className={styles.list}>
          {files.map((file) => (
            <li key={file.id} className={styles.document}>
              <div className={styles.row}>
                <span className={styles.icon} aria-hidden="true">
                  ▤
                </span>
                <button
                  className={styles.name}
                  type="button"
                  onClick={() => setSelection({ view, previewId: file.id })}
                >
                  {file.fileName}
                </button>
                <button
                  className={styles.download}
                  type="button"
                  role="link"
                  aria-label={`Download ${file.fileName}`}
                  disabled={
                    !file.usable ||
                    !signedUrl(file.downloadUrl) ||
                    !navigation.canRead ||
                    Boolean(navigation.pendingId)
                  }
                  onClick={() => void navigation.navigate(file, "download")}
                >
                  <span aria-hidden="true">↓</span>
                </button>
              </div>
              {!file.usable && (
                <DocumentState>
                  This file is not available to download yet.
                </DocumentState>
              )}
              {file.scanDisclosure && (
                <p className={styles.disclosure}>{file.scanDisclosure}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {files?.length === 0 && <DocumentState>{emptyMessage}</DocumentState>}
      {navigation.pendingId && (
        <DocumentState>Checking current file access…</DocumentState>
      )}
      {navigation.error && <DocumentState error={navigation.error} />}
      {active?.upload && available && (
        <UploadDialog
          clientId={clientId}
          source={source}
          onClose={() => setSelection(undefined)}
        />
      )}
      {preview && (
        <FilePreview
          key={`${preview.id}:${preview.lifecycleStatus}:${preview.scanStatus}`}
          clientId={clientId}
          file={preview}
          onClose={() => setSelection(undefined)}
        />
      )}
    </section>
  );
}
