"use client";

import { useState } from "react";
import { ActionButton, Field, Modal, SelectInput } from "@/shared/module-ui";
import { useHillDayExport } from "./useHillDayExport";
import type { HillDayExportScope } from "./hillday-export-recovery";
import styles from "./hillday-presentation.module.css";

type Props = { scope: HillDayExportScope; onClose: () => void };
export function HillDayExport(props: Props) {
  return <ExportDialog key={JSON.stringify(props.scope)} {...props} />;
}
function ExportDialog({ onClose, scope }: Props) {
  const [pageSize, setPageSize] = useState<"letter" | "a4">("letter");
  const state = useHillDayExport(scope);
  const ready = state.receipt?.status === "ready";
  const queued = state.creating || state.receipt?.status === "queued";
  const failed = state.receipt?.status === "failed";
  const held = state.known || !!state.error;
  const title = ready
    ? "PDF ready"
    : queued
      ? "Export in progress"
      : failed
        ? "PDF generation failed"
        : "Export unconfirmed";
  return (
    <Modal
      open
      className={styles.exportModal}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Export saved PDF"
      description={
        ready
          ? "Download the original saved PDF for this request."
          : state.known
            ? "The original request is retained. Its outcome is not confirmed."
            : state.error
              ? "Saved export history is unavailable. Request retention is not confirmed."
              : "Create a PDF from the current saved document."
      }
      footer={
        <>
          <ActionButton className={styles.button} onClick={onClose}>
            Close
          </ActionButton>
          {ready ? (
            <ActionButton
              className={styles.button}
              primary
              disabled={!state.canDownload || state.pending}
              onClick={() => void state.download()}
            >
              {state.downloading ? "Downloading…" : "Download PDF"}
            </ActionButton>
          ) : held ? (
            <ActionButton
              className={styles.button}
              primary
              disabled={state.pending || state.loading}
              onClick={() => void state.refresh()}
            >
              {state.creating
                ? "Generating…"
                : state.checking
                  ? "Checking…"
                  : "Check status"}
            </ActionButton>
          ) : (
            <ActionButton
              className={styles.button}
              primary
              disabled={!state.ready || state.pending}
              onClick={() => void state.generate(pageSize)}
            >
              {state.creating ? "Generating…" : "Generate PDF"}
            </ActionButton>
          )}
        </>
      }
    >
      <div
        className={styles.exportBody}
        data-design-node={
          ready ? "3146:116036" : held ? "3148:134123" : "3146:115992"
        }
      >
        <Field label="Page size" htmlFor="hillday-export-size">
          <SelectInput
            id="hillday-export-size"
            value={state.pageSize ?? pageSize}
            disabled={held || !state.ready || state.pending}
            onValueChange={(value) => setPageSize(value as "letter" | "a4")}
            options={[
              { value: "letter", label: "US Letter" },
              { value: "a4", label: "A4" },
            ]}
          />
        </Field>
        {held && (
          <div className={styles.resultCard}>
            <strong role="status">{title}</strong>
            {ready ? (
              <>
                <p>{state.receipt?.filename}</p>
                <p className={styles.caption}>
                  {state.expired
                    ? "Download link expired. Refresh it to download this export."
                    : state.receipt?.url && state.receipt.expiresAt
                      ? `Download link expires ${new Date(state.receipt.expiresAt).toLocaleString()}.`
                      : "A download link is unavailable. Check status when signing is available."}
                </p>
                <ActionButton
                  className={styles.button}
                  disabled={state.pending}
                  onClick={() => void state.refresh()}
                >
                  Refresh download link
                </ActionButton>
              </>
            ) : (
              <>
                <p>
                  {queued
                    ? "The original request is still being prepared."
                    : failed
                      ? (state.receipt?.error ??
                        "The renderer reported a failure.")
                      : state.known
                        ? "Checking status looks up the original request. It does not create another PDF."
                        : "Check status reads saved export history without creating a PDF."}
                </p>
                {!queued && !failed && (
                  <p className={styles.caption}>
                    An unavailable or absent result does not confirm that no
                    export occurred.
                  </p>
                )}
              </>
            )}
            {state.error && <p role="alert">{state.error}</p>}
            {state.checking && (
              <p role="status" className={styles.caption}>
                Checking export status…
              </p>
            )}
          </div>
        )}
        {state.loading && <p role="status">Reading saved export request…</p>}
        <p className={styles.caption}>
          {state.known
            ? "This request is retained across closing and reloading. Check status looks for its original saved PDF without generating a replacement."
            : state.error
              ? "Saved export history could not be read. Check status before generating a PDF; whether an earlier request was retained is not confirmed."
              : "After you generate a PDF, its request is retained across closing and reloading. If its outcome is unconfirmed, Check status will look up the original request without generating a replacement."}
        </p>
      </div>
    </Modal>
  );
}
