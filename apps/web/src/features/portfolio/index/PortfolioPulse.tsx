import type { Client } from "./contracts";
import styles from "./portfolio.module.css";
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
        {[
          [
            "Clients",
            // Owner definition: non-archived client profiles; exclude firm
            // profiles and prospects. Archiving sets status "archived".
            clients?.filter(
              (c) => c.profileType === "CLIENT" && c.status !== "archived",
            ).length,
          ],
          ["Need attention", undefined],
          ["Objectives", undefined],
          ["Off track", undefined],
          ["Strategies", undefined],
        ].map(([label, count]) => (
          <div key={label}>
            <strong>{count ?? "—"}</strong>
            <span className="eyebrow">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
