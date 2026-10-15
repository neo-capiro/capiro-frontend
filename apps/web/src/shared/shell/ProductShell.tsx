import { SelectedClientGate } from "../session/SelectedClient";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { MeriSection } from "./SidebarDestinations";
import { MeriMobileNavigation } from "./MeriMobileNavigation";
import styles from "./shell.module.css";

export function ProductShell({
  children,
  designTarget = "1064:144075",
  assetSet = "home",
  actionWorkflow = false,
  documentWorkflow = false,
  fixture = false,
  section,
}: {
  children: React.ReactNode;
  designTarget?: string;
  assetSet?: "home" | "cited-answer";
  actionWorkflow?: boolean;
  documentWorkflow?: boolean;
  fixture?: boolean;
  /** Marks the matching sidebar destination as current. */
  section?: MeriSection | undefined;
}) {
  return (
    <>
      <div className={styles.target} data-design-target={designTarget}>
        <Header assetSet={assetSet} />
        <MeriMobileNavigation />
        <div className={styles.workspace}>
          <Sidebar assetSet={assetSet} fixture={fixture} section={section} />
          <main id="main-content" className={styles.main}>
            {actionWorkflow || documentWorkflow ? (
              children
            ) : (
              <SelectedClientGate>{children}</SelectedClientGate>
            )}
          </main>
        </div>
      </div>
      <footer className={styles.fixtureNotice}>
        <div role="note">
          {fixture ? (
            <>
              <strong>Disconnected synthetic fixture.</strong> Jordan, Anduril,
              recent titles, answer, citations and approval counts are samples.
              Drafts stay in this page only.
            </>
          ) : (
            <>
              {documentWorkflow
                ? "Document files require a verified document connection. Generated files remain drafts; native Office rendering is unverified."
                : actionWorkflow
                  ? "Recommendation actions require a verified action connection."
                  : "Conversation operations require a verified runtime connection. Client and account details come from the connected Capiro services."}
            </>
          )}
        </div>
      </footer>
    </>
  );
}
