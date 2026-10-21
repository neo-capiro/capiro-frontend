import { SelectedClientGate } from "../session/SelectedClient";
import { MeriCapabilityRouteGuard } from "../meri-resources/CapabilityRouteGuard";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { MeriSection } from "./SidebarDestinations";
import { MeriMobileNavigation } from "./MeriMobileNavigation";
import {
  MeriSidebarVisibility,
  MeriSidebarWorkspace,
} from "./MeriSidebarVisibility";
import styles from "./shell.module.css";

export function ProductShell({
  children,
  designTarget = "1064:144075",
  assetSet = "home",
  actionWorkflow = false,
  documentWorkflow = false,
  fixture = false,
  conversationEnabled = false,
  firstChatBootstrapEnabled = false,
  firstChatBootstrapClientId,
  section,
  pendingApprovals,
}: {
  children: React.ReactNode;
  designTarget?: string;
  assetSet?: "home" | "cited-answer";
  actionWorkflow?: boolean;
  documentWorkflow?: boolean;
  fixture?: boolean;
  conversationEnabled?: boolean;
  firstChatBootstrapEnabled?: boolean;
  firstChatBootstrapClientId?: string;
  /** Marks the matching sidebar destination as current. */
  section?: MeriSection | undefined;
  /** Fixture sample count shown on the Approvals destination. */
  pendingApprovals?: number | undefined;
}) {
  return (
    <>
      <MeriSidebarVisibility>
        <div className={styles.target} data-design-target={designTarget}>
          <Header assetSet={assetSet} fixture={fixture} />
          <MeriMobileNavigation
            assetSet={assetSet}
            fixture={fixture}
            conversationEnabled={conversationEnabled}
            firstChatBootstrapEnabled={firstChatBootstrapEnabled}
            firstChatBootstrapClientId={firstChatBootstrapClientId}
            section={section}
            pendingApprovals={pendingApprovals}
          />
          <MeriSidebarWorkspace>
            <Sidebar
              assetSet={assetSet}
              fixture={fixture}
              conversationEnabled={conversationEnabled}
              firstChatBootstrapEnabled={firstChatBootstrapEnabled}
              firstChatBootstrapClientId={firstChatBootstrapClientId}
              section={section}
              pendingApprovals={pendingApprovals}
            />
            <main id="main-content" className={styles.main}>
              {actionWorkflow || documentWorkflow ? (
                <MeriCapabilityRouteGuard>{children}</MeriCapabilityRouteGuard>
              ) : (
                <SelectedClientGate>
                  <MeriCapabilityRouteGuard>
                    {children}
                  </MeriCapabilityRouteGuard>
                </SelectedClientGate>
              )}
            </main>
          </MeriSidebarWorkspace>
        </div>
      </MeriSidebarVisibility>
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
