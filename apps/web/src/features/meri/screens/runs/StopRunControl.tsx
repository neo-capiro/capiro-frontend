"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { DialogClose } from "@capiro/ui/dialog";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import styles from "./runs.module.css";

/** Stop trigger with the Overlay · Stop remaining work? confirmation; confirming is never executed here. */
export function StopRunControl({
  label,
  variant,
  unavailable,
}: {
  label: string;
  variant: "primary" | "outline";
  unavailable: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={ui[variant]}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <X aria-hidden /> {label}
      </button>
      <MeriDialog
        open={open}
        onOpenChange={setOpen}
        title="Stop remaining work?"
        description="Verified files and completed receipts are preserved."
        width="compact"
      >
        <div className={styles.dialogActions}>
          <button
            type="button"
            className={ui.primary}
            disabled
            title={unavailable}
          >
            <X aria-hidden /> Stop
          </button>
          <DialogClose className={ui.outline}>Keep running</DialogClose>
        </div>
      </MeriDialog>
    </>
  );
}
