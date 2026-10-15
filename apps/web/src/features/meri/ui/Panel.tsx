import type { ReactNode } from "react";
import styles from "./panel.module.css";

/** Bordered Figma 3.4 surface for reviews, receipts and in-page dialogs. */
export function Panel({
  label,
  tone = "card",
  raised = false,
  narrow = false,
  children,
}: {
  label: string;
  tone?: "card" | "muted";
  raised?: boolean;
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`${styles.panel} ${narrow ? styles.narrow : ""}`}
      data-tone={tone}
      data-raised={raised || undefined}
      aria-label={label}
    >
      {children}
    </section>
  );
}
