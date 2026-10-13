import { SelectedClientGate } from "../session/SelectedClient";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MeriMobileNavigation } from "./MeriMobileNavigation";
import styles from "./shell.module.css";

export function ProductShell({
  children,
  designTarget = "442:81437",
  assetSet = "home",
  actionWorkflow = false,
}: {
  children: React.ReactNode;
  designTarget?: string;
  assetSet?: "home" | "cited-answer";
  actionWorkflow?: boolean;
}) {
  return (
    <>
      <div className={styles.target} data-design-target={designTarget}>
        <Header assetSet={assetSet} />
        <MeriMobileNavigation />
        <div className={styles.workspace}>
          <Sidebar assetSet={assetSet} />
          <main id="main-content" className={styles.main}>
            {actionWorkflow ? (
              children
            ) : (
              <SelectedClientGate>{children}</SelectedClientGate>
            )}
          </main>
        </div>
      </div>
      <footer className={styles.fixtureNotice}>
        <div role="note">
          {actionWorkflow ? (
            <>
              <strong>
                Conversation and workspace samples remain disconnected.
              </strong>{" "}
              Recommendation actions require a verified action connection.
            </>
          ) : (
            <>
              <strong>Disconnected synthetic fixture.</strong> Jordan, Anduril,
              recent titles, answer, citations and approval counts are samples.
              No signed-in identity, authorized source data or sending is
              available. Drafts stay in this page only.
            </>
          )}
        </div>
      </footer>
    </>
  );
}
