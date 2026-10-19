"use client";
import { useRef } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { signedUrl, type Attachment } from "./contracts";
import { useExtractFile } from "./extraction";
import { useFileNavigation } from "./navigation";
export function FilePreview({
  clientId,
  file,
  onClose,
}: {
  clientId: string;
  file: Attachment;
  onClose: () => void;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const extract = useExtractFile(clientId, file);
  const navigation = useFileNavigation(clientId, `${file.id}:${file.source}`);
  const preview = file.usable ? signedUrl(file.previewUrl) : undefined;
  const download = file.usable ? signedUrl(file.downloadUrl) : undefined;
  return (
    <Dialog
      open
      title={file.fileName}
      description="Open the original file or read the service's extracted text."
      onOpenAutoFocus={() => {
        opener.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      }}
      onCloseAutoFocus={(event) => {
        if (opener.current?.isConnected) {
          event.preventDefault();
          opener.current.focus();
        }
      }}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className="stack">
        {file.scanDisclosure && <p role="status">{file.scanDisclosure}</p>}
        {!file.usable ? (
          <p role="alert">
            This file cannot be opened:{" "}
            {file.blockedReason ?? file.lifecycleStatus}.
          </p>
        ) : (
          <div className="status">
            <p>
              Inline preview is unavailable. Open the original file in a new tab
              or download it.
            </p>
          </div>
        )}
        <div className="row">
          {preview && (
            <button
              type="button"
              role="link"
              className="button"
              disabled={!navigation.canRead || Boolean(navigation.pendingId)}
              onClick={() => void navigation.navigate(file, "preview")}
            >
              Open in new tab
            </button>
          )}
          {download && (
            <button
              type="button"
              role="link"
              className="button primary"
              disabled={!navigation.canRead || Boolean(navigation.pendingId)}
              onClick={() => void navigation.navigate(file, "download")}
            >
              Download
            </button>
          )}
        </div>
        {navigation.pendingId && (
          <p role="status">Checking current file access…</p>
        )}
        <QueryState error={navigation.error} />
        <button
          className="button"
          disabled={!file.usable || !extract.canReadText || extract.isPending}
          onClick={() => extract.mutate()}
        >
          {extract.isPending ? "Reading text…" : "Read extracted text"}
        </button>
        <QueryState error={extract.error} />
        {file.usable && extract.isSuccess && extract.data && (
          <>
            <p role="status">
              {extract.data.truncated
                ? "Partial text · extraction limit reached."
                : "Extracted text"}
            </p>
            {extract.data.disclosure && (
              <small>{extract.data.disclosure}</small>
            )}
            <pre
              style={{
                whiteSpace: "pre-wrap",
                maxHeight: 400,
                overflow: "auto",
              }}
            >
              {extract.data.text || "No readable text was found."}
            </pre>
          </>
        )}
      </div>
    </Dialog>
  );
}
