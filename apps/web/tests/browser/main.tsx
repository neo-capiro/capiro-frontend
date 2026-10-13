import { createRoot } from "react-dom/client";
import { AcceptanceActivityAuthorityHarness } from "./acceptance-activity-authority-harness";
import { AcceptanceBillSearchHarness } from "./acceptance-bill-search-harness";
import { AcceptanceMeetingArtifactsHarness } from "./acceptance-meeting-artifacts-harness";
import { AcceptanceRelationshipsProbe } from "./acceptance-relationships-probe";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import { Shell } from "@/shared/portfolio/shell/Shell";
import { ClientFrame } from "@/features/portfolio/client-profile/ClientFrame";
import { ClientOverview } from "@/features/portfolio/client-profile/ClientOverview";
import { PastPerformance } from "@/features/portfolio/client-profile/past-performance/public";
import { PortfolioIndex } from "@/features/portfolio/index/PortfolioIndex";
import { ObjectivesPage } from "@/features/portfolio/objectives/ObjectivesPage";
import { WorkPage } from "@/features/portfolio/work/WorkPage";
import { RelationshipsPage } from "@/features/portfolio/relationships/RelationshipsPage";
import { CapabilitiesPage } from "@/features/portfolio/capabilities/CapabilitiesPage";
import { CalendarPage } from "@/features/portfolio/calendar/CalendarPage";
import { FilesPage } from "@/features/portfolio/files/FilesPage";
import { ProspectsIndex } from "@/features/portfolio/prospects/ProspectsIndex";
import { ProspectDetail } from "@/features/portfolio/prospects/ProspectDetail";
import { BillTrackerPage } from "@/features/portfolio/bill-tracker/BillTrackerPage";
import { OpportunitiesPage } from "@/features/portfolio/opportunities/OpportunitiesPage";
import { RegistrantIntakeHarness } from "./registrant-intake-harness";
import { EmailComposeHarness } from "./email-compose-harness";
import { MeetingDocumentsHarness } from "./meeting-documents-harness";
import { ProfileToolsHarness } from "./profile-tools-harness";
import { VoiceHarness } from "./voice-harness";
import { ThreadMailHarness } from "./thread-mail-harness";
import { PortfolioLayoutHarness } from "./portfolio-layout-harness";
import { CalendarSyncHarness } from "./calendar-sync-harness";
import { GlobalObjectiveHarness } from "./global-objective-harness";
import { ObjectiveSessionHarness } from "./objective-session-harness";
import { ProfileCapacityHarness } from "./profile-capacity-harness";
import { MemberNotesHarness } from "./member-notes-harness";
import { BillingSummaryHarness } from "./billing-summary-harness";
import { MeetingReviewHarness } from "./meeting-review-harness";
import {
  PublicEventHarness,
  PublicEventCalendarHarness,
} from "./public-event-harness";
import { usePathname } from "./navigation";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";
// Deliberately only loopback destinations; intercepts cannot reach live APIs.
const destinations = {
  existingApp: "http://127.0.0.1:5191/existing",
  meri: "http://127.0.0.1:5191/meri",
};
function App() {
  const path = usePathname();
  if (path === "/__test/acceptance-activity-authority")
    return <AcceptanceActivityAuthorityHarness />;
  if (path === "/__test/acceptance-bill-search")
    return <AcceptanceBillSearchHarness />;
  if (path === "/__test/acceptance-meeting-artifacts")
    return <AcceptanceMeetingArtifactsHarness />;
  if (path === "/__test/registrant-intake") return <RegistrantIntakeHarness />;
  if (path === "/__test/email-compose") return <EmailComposeHarness />;
  if (path === "/__test/meeting-documents") return <MeetingDocumentsHarness />;
  if (path === "/__test/profile-tools") return <ProfileToolsHarness />;
  if (path === "/__test/voice-source") return <VoiceHarness />;
  if (path === "/__test/thread-mail") return <ThreadMailHarness />;
  if (path === "/__test/public-event") return <PublicEventHarness />;
  if (path === "/__test/portfolio-layout") return <PortfolioLayoutHarness />;
  if (path === "/__test/calendar-sync") return <CalendarSyncHarness />;
  if (path === "/__test/global-objective") return <GlobalObjectiveHarness />;
  if (path === "/__test/objective-session") return <ObjectiveSessionHarness />;
  if (path === "/__test/profile-capacity") return <ProfileCapacityHarness />;
  if (path === "/__test/member-notes") return <MemberNotesHarness />;
  if (path === "/__test/billing-summary") return <BillingSummaryHarness />;
  if (path === "/__test/meeting-review") return <MeetingReviewHarness />;
  if (path === "/__test/past-performance")
    return (
      <Shell destinations={destinations}>
        <PastPerformance
          clientId="10000000-0000-4000-8000-000000000001"
          clientName="Test Aerospace"
        />
      </Shell>
    );
  const [, , clientId, tab] = path.split("/");
  if (clientId === "prospects")
    return tab ? (
      <ProspectDetail id={tab} destinations={destinations} />
    ) : (
      <ProspectsIndex destinations={destinations} />
    );
  if (path === "/calendar")
    return (
      <Shell destinations={destinations}>
        <PublicEventCalendarHarness />
      </Shell>
    );
  if (!clientId) return <PortfolioIndex destinations={destinations} />;
  const content =
    tab === "opportunities" ? (
      <OpportunitiesPage clientId={clientId} destinations={destinations} />
    ) : tab === "bills" ? (
      <BillTrackerPage
        clientId={clientId}
        backend={
          new URLSearchParams(window.location.search).get("testBackend") ===
          "core"
            ? "core"
            : "intelligence"
        }
        destinations={destinations}
      />
    ) : tab === "files" ? (
      <FilesPage clientId={clientId} destinations={destinations} />
    ) : tab === "objectives" ? (
      <ObjectivesPage clientId={clientId} />
    ) : tab === "work" ? (
      <WorkPage clientId={clientId} destinations={destinations} />
    ) : tab === "relationships" ? (
      <RelationshipsPage clientId={clientId} destinations={destinations} />
    ) : tab === "capabilities" ? (
      <CapabilitiesPage clientId={clientId} destinations={destinations} />
    ) : tab === "calendar" ? (
      <CalendarPage clientId={clientId} destinations={destinations} />
    ) : (
      <ClientOverview clientId={clientId} />
    );
  return (
    <ClientFrame clientId={clientId} destinations={destinations}>
      {content}
    </ClientFrame>
  );
}
createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <AcceptanceRelationshipsProbe />
    <App />
  </PortfolioHarnessProviders>,
);
