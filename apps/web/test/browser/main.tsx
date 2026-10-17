import { TaskDetailRefreshProbe } from "./TaskDetailRefreshProbe";
import { ProposalRefreshProbe } from "./ProposalRefreshProbe";
import { OnboardHost } from "../../src/app/_onboard/OnboardHost";
import type { OnboardRoute } from "../../src/features/onboard/OnboardPage";
import { MeriFilesHost } from "../../src/app/meri/files/MeriFilesHost";
import { MeriActionHost } from "../../src/app/meri/actions/MeriActionHost";
import { MeriTaskUpdateHost } from "../../src/app/meri/task-updates/MeriTaskUpdateHost";
import { IntegrationProbe } from "./IntegrationProbe";
import { OnboardBoundaryProbe } from "./OnboardBoundaryProbe";
import { isOnboardPath } from "../../src/shared/session/onboard-route";
import { RequireSession } from "../../src/shared/session/SessionContext";
import { PortfolioIndex } from "../../src/features/portfolio/index/PortfolioIndex";
import { ClientFrame } from "../../src/features/portfolio/client-profile/ClientFrame";
import { ObjectivesPage } from "../../src/features/portfolio/objectives/ObjectivesPage";
import { ClientOverview } from "../../src/features/portfolio/client-profile/ClientOverview";
import { CalendarPage } from "../../src/features/portfolio/calendar/CalendarPage";
import { ObjectiveCalendarDestination } from "../../src/features/portfolio/calendar/ObjectiveCalendarDestination";
import { ProductShell } from "../../src/shared/shell/ProductShell";
import { MeriHomeFixture } from "../../src/features/meri/fixtures/MeriHomeFixture";
import { MeriCitedAnswer } from "../../src/features/meri/MeriCitedAnswer";
import { findFixtureScreen } from "../../src/features/meri/fixtures/screens/registry";
import { pendingApprovals } from "../../src/features/meri/fixtures/screens/approval-counts";
import { MeriHome } from "../../src/features/meri/MeriHome";
import "../../src/shared/portfolio/styles.css";
import { ApplicationBoundary } from "../../src/shared/session/ApplicationBoundary";
import { StrictMode } from "react";
import { PublicForm } from "../../src/features/modules/planner/PublicForm";
import { createRoot } from "react-dom/client";
import { CapiroBoundary } from "../../src/shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../src/shared/capiro/queries";
import { ModuleShell } from "../../src/shared/shell/ModuleShell";
import { SettingsScreen } from "../../src/features/settings";
import { MeriPreferencesPanel } from "../../src/features/meri/screens/settings/MeriPreferencesPanel";
import { ModuleScreen } from "../../src/features/modules/ModuleScreen";
import { ModuleHub } from "../../src/features/modules/hub/ModuleHub";
import type { ModuleSlug } from "../../src/shared/shell/module-catalog";
import { usePathname, useSearchParams } from "./navigation";
import "../../src/app/globals.css";
import "./font.css";

function SessionProbe() {
  const identity = useCapiroQuery("me.read", {});
  return (
    <section style={{ padding: 32 }}>
      <h1>Session boundary test</h1>
      {identity.loading && <p role="status">Loading test identity…</p>}
      {identity.error && <p role="alert">{identity.error.message}</p>}
      {identity.data && (
        <p data-testid="identity">
          {identity.data.tenant.name} · {identity.data.user.firstName}
        </p>
      )}
    </section>
  );
}
function RoutedApp() {
  const path = usePathname();
  const search = useSearchParams();
  if (isOnboardPath(path) && search.get("onboard-boundary") === "1")
    return <OnboardBoundaryProbe />;
  if (isOnboardPath(path)) {
    const route =
      path.startsWith("/it/") && !["/it/done", "/it/error"].includes(path)
        ? "/it/:token"
        : (path as OnboardRoute);
    return (
      <OnboardHost
        route={route}
        publishableKey="pk_test_YQ=="
        serviceConfigured={search.get("service-unconfigured") !== "1"}
        pricingCopy={{
          lock: "Synthetic fixture price lock.",
          change: "Synthetic fixture price change.",
        }}
      />
    );
  }
  if (path === "/meri/task-updates")
    return (
      <ProductShell>
        <RequireSession>
          <MeriTaskUpdateHost
            enabled={search.get("task-updates-disabled") !== "1"}
          />
        </RequireSession>
      </ProductShell>
    );
  if (path === "/meri/files")
    return (
      <ProductShell documentWorkflow>
        <RequireSession>
          <MeriFilesHost
            enabled={search.get("documents-disabled") !== "1"}
            operation={
              search.get("document-operation") === "create_excel"
                ? "create_excel"
                : "create_word"
            }
          />
        </RequireSession>
      </ProductShell>
    );
  if (path === "/meri/actions")
    return (
      <ProductShell actionWorkflow>
        <RequireSession>
          <MeriActionHost enabled={search.get("actions-disabled") !== "1"} />
        </RequireSession>
      </ProductShell>
    );
  if (path.startsWith("/forms/"))
    return (
      <>
        <PublicForm token={path.split("/")[2] ?? ""} />
        <aside className="test-notice" aria-label="Local test fixture">
          Explicit local test fixture · synthetic form
        </aside>
      </>
    );
  if (path === "/meri/fixture/home")
    return (
      <ProductShell fixture pendingApprovals={pendingApprovals()}>
        <MeriHomeFixture />
      </ProductShell>
    );
  if (path === "/meri/fixture/cited-answer")
    return (
      <ProductShell
        pendingApprovals={pendingApprovals()}
        fixture
        section="conversations"
        designTarget="1064:144239"
        assetSet="cited-answer"
      >
        <MeriCitedAnswer />
      </ProductShell>
    );
  // Mirrors src/app/meri/fixture/[screen]/page.tsx for registered fixture screens.
  const fixtureScreen = path.startsWith("/meri/fixture/")
    ? findFixtureScreen(path.slice("/meri/fixture/".length))
    : undefined;
  if (fixtureScreen)
    return (
      <ProductShell
        fixture
        designTarget={fixtureScreen.figmaNode}
        section={fixtureScreen.section}
        pendingApprovals={pendingApprovals(fixtureScreen.slug)}
      >
        <fixtureScreen.Screen />
      </ProductShell>
    );
  if (path === "/meri")
    return (
      <ProductShell
        conversationEnabled={
          sessionStorage.getItem("meri-conversation-enabled") === "true"
        }
      >
        <RequireSession>
          <MeriHome
            conversationEnabled={
              sessionStorage.getItem("meri-conversation-enabled") === "true"
            }
          />
        </RequireSession>
      </ProductShell>
    );
  if (path === "/calendar")
    return (
      <div data-portfolio-root>
        <RequireSession>
          <ObjectiveCalendarDestination>
            <CalendarPage destinations={{}} />
          </ObjectiveCalendarDestination>
        </RequireSession>
      </div>
    );
  if (path === "/" || path === "/portfolio" || path.startsWith("/portfolio/")) {
    const id = path.split("/")[2];
    return (
      <div data-portfolio-root>
        <RequireSession>
          {id ? (
            <ClientFrame clientId={id} destinations={{}}>
              {path.split("/")[3] === "objectives" ? (
                <ObjectivesPage clientId={id} />
              ) : (
                <ClientOverview clientId={id} />
              )}
            </ClientFrame>
          ) : (
            <PortfolioIndex destinations={{}} />
          )}
        </RequireSession>
      </div>
    );
  }
  const configured = path !== "/__test/unconfigured";
  const isSettings = path.startsWith("/settings");
  const slug = path.split("/")[2] as ModuleSlug;
  const moduleView = path.startsWith("/modules/") ? (
    <ModuleScreen module={slug} />
  ) : (
    <ModuleHub />
  );
  return (
    <>
      <ModuleShell
        settings={isSettings}
        active={path.startsWith("/modules/") ? slug : "hub"}
      >
        {path === "/__test/strict" ? (
          <StrictMode>
            <CapiroBoundary
              config={{ publishableKey: "pk_test_YQ==", configured }}
            >
              <SessionProbe />
            </CapiroBoundary>
          </StrictMode>
        ) : (
          <CapiroBoundary
            config={{ publishableKey: "pk_test_YQ==", configured }}
          >
            {path === "/__test/task-detail-refresh" ? (
              <TaskDetailRefreshProbe />
            ) : path === "/__test/strategy-proposal-refresh" ? (
              <ProposalRefreshProbe />
            ) : isSettings ? (
              <SettingsScreen
                section={path.split("/")[2]}
                meriPreferences={<MeriPreferencesPanel />}
              />
            ) : path.startsWith("/modules") ? (
              moduleView
            ) : (
              <SessionProbe />
            )}
          </CapiroBoundary>
        )}
      </ModuleShell>
      <aside className="test-notice" aria-label="Local test fixture">
        Explicit local test fixture · synthetic identity and records
      </aside>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

function App() {
  return (
    <ApplicationBoundary publishableKey="pk_test_YQ==">
      <RoutedApp />
      {sessionStorage.getItem("integration-probe") && (
        <RequireSession>
          <IntegrationProbe />
        </RequireSession>
      )}
    </ApplicationBoundary>
  );
}
