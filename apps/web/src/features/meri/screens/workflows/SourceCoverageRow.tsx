import styles from "./records.module.css";

/** Success, qualified empty, partial and unavailable are distinct outcomes. */
export type CoverageOutcome = "success" | "empty" | "partial" | "unavailable";
export type SourceCoverageView = {
  domain: string;
  count: string;
  status: string;
  scope: string;
  detail: string;
  freshness: string;
  outcome: CoverageOutcome;
};

/** Meri/Source coverage rows: bounded counts, outcome and separate source, sync and read times. */
export function SourceCoverageList({
  label,
  rows,
}: {
  label: string;
  rows: readonly SourceCoverageView[];
}) {
  return (
    <ul className={styles.coverage} aria-label={label}>
      {rows.map((row) => (
        <li
          key={row.domain}
          className={styles.coverageRow}
          data-outcome={row.outcome}
        >
          <div className={styles.coverageDomain}>
            <strong>{row.domain}</strong>
            <span>{row.count}</span>
          </div>
          <div className={styles.coverageResult}>
            <strong>{row.status}</strong>
            <span>{row.scope}</span>
          </div>
          <div className={styles.coverageDetail}>
            <p>{row.detail}</p>
            <span>{row.freshness}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
