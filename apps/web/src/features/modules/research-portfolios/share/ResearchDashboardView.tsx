import type { ResearchShareDashboard } from "../../../../shared/capiro/operations/research-share-schemas";
import { DashboardGrid } from "./DashboardGrid";
import styles from "./share.module.css";

/** One rendering path for the recipient and the authenticated frozen preview. */
export function ResearchDashboardView({
  dashboard,
  logoUrl,
}: {
  dashboard: ResearchShareDashboard;
  logoUrl: string | null;
}) {
  return (
    <div className={styles.frame}>
      <p className={styles.muted}>
        Prepared for {dashboard.preparedFor.clientName} · As of{" "}
        {new Date(dashboard.asOf).toLocaleDateString()}
      </p>
      <DashboardGrid
        layout={dashboard.layout}
        dashboard={dashboard}
        logoUrl={logoUrl}
      />
      <footer className={styles.footer}>
        <span>
          {dashboard.branding
            ? `Prepared by ${dashboard.branding.firmName} with Capiro`
            : "Prepared with Capiro"}
          {" · "}snapshot {dashboard.snapshot.name}
        </span>
        <span>
          Available until {new Date(dashboard.expiresAt).toLocaleDateString()}
        </span>
      </footer>
    </div>
  );
}
