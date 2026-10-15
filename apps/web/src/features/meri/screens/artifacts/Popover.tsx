"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./document.module.css";

/**
 * Non-modal in-screen overlay: focuses its first control, closes on Escape or an
 * outside press, and returns focus to the opener when focus would otherwise be lost.
 */
export function Popover({
  label,
  onClose,
  className,
  children,
}: {
  label: string;
  onClose: () => void;
  className: string | undefined;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  // Kept across effect re-runs so a development double mount cannot capture the popover itself.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const node = ref.current;
    opener.current ??=
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const trigger = opener.current;
    const first = node?.querySelector<HTMLElement>(
      "input, textarea, button:not(:disabled)",
    );
    (first ?? node)?.focus();
    const press = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!node?.contains(target) && !trigger?.contains(target))
        close.current();
    };
    document.addEventListener("mousedown", press);
    return () => {
      document.removeEventListener("mousedown", press);
      const active = document.activeElement;
      if (trigger?.isConnected && (!active || active === document.body))
        trigger.focus();
    };
  }, []);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      className={`${styles.popover} ${className ?? ""}`}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        close.current();
      }}
    >
      {children}
    </div>
  );
}
