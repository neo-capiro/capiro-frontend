import type { CSSProperties } from "react";
import type { MetadataRow } from "./types";
import styles from "./tooling.module.css";

/** Label/value description list with the Figma label column width. */
export function MetadataList({
  label,
  rows,
  labelWidth = 148,
  strongLabels = false,
}: {
  label: string;
  rows: readonly MetadataRow[];
  labelWidth?: number;
  /** Medium-weight labels (exact payload rows) instead of caption labels. */
  strongLabels?: boolean;
}) {
  return (
    <dl
      className={styles.metadata}
      aria-label={label}
      data-strong={strongLabels || undefined}
      style={{ "--label-width": `${labelWidth}px` } as CSSProperties}
    >
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
