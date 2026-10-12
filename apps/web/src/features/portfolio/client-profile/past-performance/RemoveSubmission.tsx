"use client";
import { useRef } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { SavedSubmission } from "./contracts";
import styles from "./past-performance.module.css";

export function RemoveSubmission({
  item,
  clientName,
  pending,
  error,
  frozen,
  onClose,
  onConfirm,
}: {
  item?: SavedSubmission;
  clientName?: string;
  pending: boolean;
  error?: Error;
  frozen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open={Boolean(item)}
      title="Remove submission?"
      className={styles.dialog}
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
      <div className={styles.body}>
        <p>
          Permanently remove “{item?.title}” ({item?.fiscalYear}) from{" "}
          {clientName}’s past performance? The capability and its documents will
          remain. This cannot be undone.
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error.message}
          </p>
        )}
        {frozen && (
          <p role="alert">
            The removal result is uncertain. Refresh the history to inspect it;
            this removal will not be resent.
          </p>
        )}
      </div>
      <footer className={styles.footer}>
        <button
          className="button primary"
          disabled={pending || frozen}
          onClick={onConfirm}
        >
          {pending ? "Removing…" : "Remove submission"}
        </button>
        <button className="button" onClick={onClose}>
          Cancel
        </button>
      </footer>
    </Dialog>
  );
}
