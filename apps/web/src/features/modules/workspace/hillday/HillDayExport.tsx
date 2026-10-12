"use client";

import { useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type { HillDayDocument } from "../../../../shared/capiro/operations/workspace-schemas";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

export function HillDayExport({
  document,
  onClose,
}: {
  document: HillDayDocument;
  onClose: () => void;
}) {
  const [pageSize, setPageSize] = useState<"letter" | "a4">("letter");
  const api = useCapiro();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const exportDocument = useCapiroMutation("workspace.hillday.export");
  async function generate() {
    try {
      await exportDocument.run({
        params: { id: document.id },
        body: { pageSize },
      });
    } catch {
      /* Export service errors remain visible. */
    }
  }
  async function download() {
    const receipt = exportDocument.data;
    if (!receipt?.url) return;
    const search = new URL(receipt.url, window.location.origin).searchParams;
    setDownloading(true);
    setDownloadError("");
    try {
      const result = await api.download("workspace.hillday.download", {
        params: { id: document.id, exportId: receipt.exportId },
        query: { exp: search.get("exp") ?? "", sig: search.get("sig") ?? "" },
      });
      const url = URL.createObjectURL(result.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Download failed.",
      );
    } finally {
      setDownloading(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !exportDocument.pending && !downloading) onClose();
      }}
      title="Export Hill Day Schedule"
      description="Create a PDF from the current document."
      footer={
        <>
          <ActionButton
            disabled={exportDocument.pending || downloading}
            onClick={onClose}
          >
            Close
          </ActionButton>
          <ActionButton
            primary
            disabled={exportDocument.pending}
            onClick={generate}
          >
            {exportDocument.pending ? "Generating…" : "Generate PDF"}
          </ActionButton>
        </>
      }
    >
      <div className={styles.form}>
        <strong>{document.name}</strong>
        <Field label="Page size" htmlFor="hillday-export-size">
          <SelectInput
            id="hillday-export-size"
            value={pageSize}
            onValueChange={(value) => setPageSize(value as "letter" | "a4")}
            options={[
              { value: "letter", label: "US Letter" },
              { value: "a4", label: "A4" },
            ]}
          />
        </Field>
        {exportDocument.error && (
          <p role="alert" className={styles.error}>
            {exportDocument.error.message}
          </p>
        )}
        {exportDocument.data && (
          <div
            className={
              exportDocument.data.status === "failed"
                ? styles.notice
                : styles.success
            }
          >
            <strong>{exportDocument.data.status}</strong>
            <p>{exportDocument.data.error ?? exportDocument.data.filename}</p>
            {exportDocument.data.status === "ready" && (
              <ActionButton primary disabled={downloading} onClick={download}>
                {downloading ? "Downloading…" : "Download PDF"}
              </ActionButton>
            )}
          </div>
        )}
        {downloadError && (
          <p role="alert" className={styles.error}>
            {downloadError}
          </p>
        )}
      </div>
    </Modal>
  );
}
