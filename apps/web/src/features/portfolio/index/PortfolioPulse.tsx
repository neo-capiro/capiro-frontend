import { isClientRecord } from "@/shared/portfolio/domain/profile-type";
import type { Client } from "./contracts";
import styles from "./portfolio.module.css";

/**
 * Metrics no portfolio read supplies yet. The tile keeps the design's em dash
 * (the accepted layout has no slot for a label) and carries the explanation as
 * its title and accessible name, so "no read" is not silently read as zero.
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
          <div key={label} title={reason} aria-label={`${label}: ${reason}`}>
            <strong>—</strong>
            <span className="eyebrow">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
