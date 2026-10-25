"use client";

import { useState } from "react";
import type { HillDayDocument } from "../../../../shared/capiro/operations/workspace-schemas";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { useHillDayExport } from "./useHillDayExport";

type Props = { document: HillDayDocument; onClose: () => void };

export function HillDayExport(props: Props) {
  return (
    <ExportDialog
      key={`${props.document.id}:${props.document.client.id}`}
      {...props}
    />
  );
}

function ExportDialog({ document, onClose }: Props) {
  const [pageSize, setPageSize] = useState<"letter" | "a4">("letter");
  const state = useHillDayExport(document.id);
  const busy = state.creating || state.checking || state.downloading;
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Export Hill Day Schedule"
      description="Create a PDF from the current saved document."
      footer={
        <>
          <ActionButton onClick={onClose}>Close</ActionButton>
          {!state.known && (
            <ActionButton
              primary
              disabled={state.creating || !!state.createError}
              onClick={() => void state.generate(pageSize)}
            >
              {state.creating ? "Generating…" : "Generate PDF"}
            </ActionButton>
          )}
        </>
      }
    >
      <div className={styles.form}>
        <strong>{document.name}</strong>
        <Field label="Page size" htmlFor="hillday-export-size">
          <SelectInput
            id="hillday-export-size"
            value={pageSize}
            disabled={state.known || busy || !!state.createError}
            onValueChange={(value) => setPageSize(value as "letter" | "a4")}
            options={[
              { value: "letter", label: "US Letter" },
              { value: "a4", label: "A4" },
            ]}
          />
        </Field>
        {state.createError && (
          <p role="alert" className={styles.error}>
            {state.createError.message} No export receipt was received. Creation
            may have completed; this view cannot recover an unknown export ID.
          </p>
        )}
        {state.checking && <p role="status">Checking export status…</p>}
        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        {state.receipt && (
          <div className={styles.notice}>
            <strong role="status">
              {state.receipt.status === "queued"
                ? "Preparing PDF…"
                : state.receipt.status === "failed"
                  ? "PDF generation failed"
                  : "PDF ready"}
            </strong>
            <p>{state.receipt.error ?? state.receipt.filename}</p>
            {state.receipt.status === "ready" && (
              <>
                <p>
                  {state.expired
                    ? "Download link expired. Refresh it to download this export."
                    : state.receipt.url && state.receipt.expiresAt
                      ? `Download link expires ${new Date(state.receipt.expiresAt).toLocaleString()}.`
                      : "A download link is unavailable. Retry status when export signing is available."}
                </p>
                <ActionButton
                  primary
                  disabled={!state.canDownload || busy}
                  onClick={() => void state.download()}
                >
                  {state.downloading ? "Downloading…" : "Download PDF"}
                </ActionButton>
              </>
            )}
          </div>
        )}
        {state.known && (
          <ActionButton disabled={busy} onClick={state.refresh}>
            {state.receipt?.status === "ready"
              ? "Refresh download link"
              : "Retry status"}
          </ActionButton>
        )}
        {state.downloadError && (
          <p role="alert" className={styles.error}>
            {state.downloadError}
          </p>
        )}
        {state.known && (
          <p className={styles.muted}>
            Status and link refresh reuse this export. Keep this dialog open to
            recover its receipt; closing or reloading clears it from this view.
          </p>
        )}
      </div>
    </Modal>
  );
}
