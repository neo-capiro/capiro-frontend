"use client";
import { useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@capiro/ui/dialog";
import styles from "./meri-dialog.module.css";

/** A close target is only usable while it is still the mounted, visible, enabled control. */
function usable(node: HTMLElement | null | undefined): node is HTMLElement {
  return Boolean(
    node &&
    node !== document.body &&
    node.isConnected &&
    !node.hasAttribute("disabled") &&
    node.getClientRects().length > 0,
  );
}

/** Meri dialog panel (Figma 3.4 "Dialog · …"): title, close, guidance and body. */
export function MeriDialog({
  open,
  onOpenChange,
  title,
  description,
  placement = "below-heading",
  width = "wide",
  hint = false,
  clearBackdrop = false,
  returnFocus,
  opener,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Figma anchors dialogs either at the content top or below the page heading. */
  placement?: "top" | "below-heading";
  /** compact 560px, default 720px, wide 800px, extra-wide 960px (Figma frame widths). */
  width?: "compact" | "default" | "wide" | "extra-wide";
  /** Renders the description as the smaller keyboard-hint line. */
  hint?: boolean;
  /** Keep the modal overlay interactive without dimming the underlying page. */
  clearBackdrop?: boolean;
  /** Receives focus on close when the dialog was not opened from a control (open on load). */
  returnFocus?: RefObject<HTMLElement | null>;
  /**
   * The control that opened this dialog. Focus returns to it on close ahead of anything observed when
   * the dialog opened, and only while it is still mounted, visible and enabled.
   */
  opener?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const captured = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${styles.portalSurface} ${styles.dialog}`}
        data-placement={placement}
        data-width={width}
        data-clear-backdrop={clearBackdrop ? "" : undefined}
        showCloseButton={false}
        onOpenAutoFocus={() => {
          captured.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          const wanted = opener?.current;
          const observed = captured.current;
          captured.current = null;
          const target = usable(wanted)
            ? wanted
            : observed?.isConnected && observed !== document.body
              ? observed
              : returnFocus?.current;
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <div className={styles.heading}>
          <DialogTitle className={styles.title}>{title}</DialogTitle>
          <DialogClose className={styles.close} aria-label="Close dialog">
            <X aria-hidden />
          </DialogClose>
        </div>
        <DialogDescription className={hint ? styles.hint : styles.description}>
          {description}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
