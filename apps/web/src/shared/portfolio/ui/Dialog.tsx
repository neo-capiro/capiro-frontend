"use client";
import {
  Dialog as DialogRoot,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@capiro/ui/dialog";
import { useRef, type ComponentProps, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./dialog.module.css";
import {
  useDialogOverlayDismissal,
  useDialogReturnFocus,
} from "./dialog-interaction";
const guardedEscape = new WeakSet<KeyboardEvent>();
const handledEscape = new WeakSet<KeyboardEvent>();
// Radix installs/removes its highest-layer listener in passive effects. During
// nested portal mount, a parent's old listener can observe the child's Escape.
// Keep Radix focus/portal ownership and guard only that transition's dismissal.
function dismissTopDialog(
  event: KeyboardEvent,
  content: HTMLDivElement | null,
  onOpenChange: (open: boolean) => void,
) {
  if (event.key !== "Escape" || !content || handledEscape.has(event)) return;
  const dialogs = content.ownerDocument.querySelectorAll(
    '[role="dialog"][data-state="open"]',
  );
  if (dialogs.item(dialogs.length - 1) !== content) {
    event.preventDefault();
    guardedEscape.add(event);
    return;
  }
  if (event.defaultPrevented && !guardedEscape.has(event)) return;
  event.preventDefault();
  handledEscape.add(event);
  onOpenChange(false);
}
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  drawer = false,
  wide = false,
  className = "",
  onCloseAutoFocus,
  onOpenAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  drawer?: boolean;
  wide?: boolean;
  className?: string;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
  onOpenAutoFocus?: ComponentProps<typeof DialogContent>["onOpenAutoFocus"];
}) {
  const content = useRef<HTMLDivElement>(null);
  useDialogOverlayDismissal(open, content, onOpenChange);
  const returnFocus = useDialogReturnFocus(open);
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={content}
        aria-modal="true"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          returnFocus(event);
        }}
        onOpenAutoFocus={onOpenAutoFocus}
        onEscapeKeyDown={(event) =>
          dismissTopDialog(event, content.current, onOpenChange)
        }
        onKeyDown={(event) => {
          // Covers an immediately focused child before its passive listener is
          // attached. A nested popup/dialog keeps its own keyboard handling.
          if (
            event.target instanceof Element &&
            event.target.closest('[role="dialog"]') === content.current
          )
            dismissTopDialog(event.nativeEvent, content.current, onOpenChange);
        }}
        className={`${styles.content} ${drawer ? styles.drawer : ""} ${wide ? styles.wide : ""} ${className}`}
      >
        <header className="row between">
          <DialogTitle asChild>
            <h2>{title}</h2>
          </DialogTitle>
          <DialogClose className="button ghost iconButton" aria-label="Close">
            <X size={16} />
          </DialogClose>
        </header>
        {description ? (
          <DialogDescription className="muted">{description}</DialogDescription>
        ) : (
          <DialogDescription className="srOnly">{title}</DialogDescription>
        )}
        {children}
      </DialogContent>
    </DialogRoot>
  );
}
