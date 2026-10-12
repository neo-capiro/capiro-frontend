"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@capiro/ui/dialog";
import { useRef, type ReactNode } from "react";
import styles from "./module-ui.module.css";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "center",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "center" | "right";
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${styles.modal} ${side === "right" ? styles.drawer : ""}`}
        showCloseButton={false}
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          const target = opener.current;
          opener.current = null;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <header className={styles.modalHeader}>
          <div>
            <DialogTitle className={styles.modalTitle}>{title}</DialogTitle>
            <DialogDescription
              className={description ? styles.description : "sr-only"}
            >
              {description ?? `${title} dialog`}
            </DialogDescription>
          </div>
          <DialogClose className={styles.close} aria-label="Close dialog">
            ×
          </DialogClose>
        </header>
        <div className={styles.modalBody}>{children}</div>
        {footer && <footer className={styles.modalFooter}>{footer}</footer>}
      </DialogContent>
    </Dialog>
  );
}
