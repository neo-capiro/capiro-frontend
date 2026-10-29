import { useRef, type ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@capiro/ui/dialog";
import { Icon } from "./icons";
import dialogStyles from "@/shared/portfolio/ui/dialog.module.css";

/** Adopted dialog owns Escape, focus containment and dismissal. */
export function Modal({
  title,
  onClose,
  children,
  width = 520,
}: {
  title: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  width?: number;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`${dialogStyles.content} onboard-surface`}
        showCloseButton={false}
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
        style={{
          background: "#fff",
          borderRadius: 10,
          width: "calc(100vw - 48px)",
          maxWidth: width,
          minHeight: 0,
          maxHeight: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          padding: 0,
          boxShadow: "0 18px 50px rgba(12,26,56,0.28)",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-1)",
            flexShrink: 0,
          }}
        >
          <DialogTitle
            style={{ margin: 0, fontSize: 14.5, letterSpacing: "-0.005em" }}
          >
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review the details and choose an action or close this dialog.
          </DialogDescription>
          <DialogClose
            aria-label="Close"
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--ink-3)",
              display: "grid",
              placeItems: "center",
              padding: 4,
            }}
          >
            <Icon name="X" size={16} />
          </DialogClose>
        </header>
        <div style={{ padding: 20, overflowY: "auto" }}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
