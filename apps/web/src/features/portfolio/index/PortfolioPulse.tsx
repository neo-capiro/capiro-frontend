import type { Client } from "./contracts";
import { isClientRecord } from "./profile-type";
import styles from "./portfolio.module.css";

/**
 * Metrics the portfolio service does not report yet. They render an explicit
 * "not reported" state instead of a bare em dash so a missing read cannot be
 * mistaken for a measured zero.
 */
const UNREPORTED = [
  [
    "Need attention",
    "Alert coverage is not reported by the portfolio service.",
  ],
  [
    "Objectives",
    "Objective coverage is not reported by the portfolio service.",
  ],
  ["Off track", "Objective health is not reported by the portfolio service."],
  ["Strategies", "Strategy coverage is not reported by the portfolio service."],
] as const;
export function PortfolioPulse({
  clients,
  fiscalYear,
}: {
  clients?: Client[];
  fiscalYear: number;
}) {
  return (
    <section className={styles.pulse} aria-label="Portfolio pulse">
      <div className={styles.coverage}>
        <p className="eyebrow">
          Portfolio pulse · FY{String(fiscalYear).slice(-2)}
        </p>
        <div className="row">
          <strong>—</strong>
          <small>
            of work linked
            <br />
            to an objective
          </small>
        </div>
        <small className={styles.pulseUnavailable}>
          Objective linkage is not reported yet
        </small>
      </div>
      <div
        className={styles.pulseStats}
        role="region"
        aria-label="Portfolio pulse metrics"
        tabIndex={0}
      >
        <div>
          <strong>
            {clients?.filter((c) => isClientRecord(c.profileType)).length ??
              "—"}
          </strong>
          <span className="eyebrow">Clients</span>
        </div>
        {UNREPORTED.map(([label, reason]) => (
          <div key={label} title={reason}>
            <strong>—</strong>
            <span className="eyebrow">{label}</span>
            <small className={styles.pulseUnavailable}>Not reported yet</small>
          </div>
        ))}
      </div>
    </section>
  );
}
