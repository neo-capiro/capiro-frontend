import styles from "./meri-ui.module.css";

export type StatusTone = "neutral" | "success" | "warning" | "danger";

/** Meri/Status: semantic state, independent from evidence quality. */
export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: StatusTone;
  children: string;
}) {
  return (
    <span className={styles.status} data-tone={tone}>
      {children}
    </span>
  );
}
