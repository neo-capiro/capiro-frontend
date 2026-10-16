import { useId, type ReactNode } from "react";
import { StatusPill, type StatusTone } from "./StatusPill";
import styles from "./state-message.module.css";

/**
 * Figma 3.4 "State · …" card: an empty, zero-result or informational state with
 * its status pill, explanation and recovery action. A zero result never claims absence.
 */
export function StateMessage({
  title,
  status,
  tone = "neutral",
  announce = false,
  action,
  children,
}: {
  title: string;
  status: string;
  tone?: StatusTone;
  /** Announces the state politely when it replaces results after local input. */
  announce?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      className={styles.state}
      aria-labelledby={titleId}
      role={announce ? "status" : undefined}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <StatusPill tone={tone}>{status}</StatusPill>
      <div className={styles.body}>{children}</div>
      {action}
    </section>
  );
}
