"use client";
import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import ui from "./meri-ui.module.css";
import styles from "./toast.module.css";

/** Polite live region anchoring toasts to the bottom-right of the workspace. */
export function ToastRegion({ children }: { children: ReactNode }) {
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {children}
    </div>
  );
}

/** Figma 3.4 Sonner toast surface: optional outcome icon, title, detail, extra content and dismiss. */
export function ToastCard({
  title,
  detail,
  icon,
  onDismiss,
  children,
}: {
  title: string;
  detail: string;
  icon?: "success" | "danger" | undefined;
  onDismiss: () => void;
  children?: ReactNode;
}) {
  return (
    <section className={styles.toast} aria-label={title} data-tone={icon}>
      {icon ? (
        <span className={styles.icon} aria-hidden>
          {icon === "success" ? <Check /> : <X />}
        </span>
      ) : null}
      <div className={styles.content}>
        <h2>{title}</h2>
        <p>{detail}</p>
        {children}
      </div>
      <button
        type="button"
        className={ui.ghost}
        aria-label={`Dismiss ${title}`}
        onClick={onDismiss}
      >
        <X aria-hidden />
      </button>
    </section>
  );
}
