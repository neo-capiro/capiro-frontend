import type { ReactNode } from "react";
import type { StatusTone } from "./StatusPill";
import styles from "./meri-ui.module.css";

/** Toned callout used for outcomes and review guidance. */
export function Notice({
  tone = "neutral",
  title,
  children,
  action,
}: {
  tone?: StatusTone;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={styles.notice}
      data-tone={tone}
      role={tone === "danger" ? "alert" : undefined}
    >
      <h2>{title}</h2>
      <p className={styles.muted}>{children}</p>
      {action}
    </section>
  );
}
