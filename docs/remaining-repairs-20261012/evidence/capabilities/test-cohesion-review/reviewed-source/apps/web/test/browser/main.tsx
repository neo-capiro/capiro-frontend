import { IntegrationProbe } from "./IntegrationProbe";
import { RequireSession } from "../../src/shared/session/SessionContext";
import { PortfolioIndex } from "../../src/features/portfolio/index/PortfolioIndex";
import { ClientFrame } from "../../src/features/portfolio/client-profile/ClientFrame";
import { ObjectivesPage } from "../../src/features/portfolio/objectives/ObjectivesPage";
import { ClientOverview } from "../../src/features/portfolio/client-profile/ClientOverview";
import { ProductShell } from "../../src/shared/shell/ProductShell";
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
import { ModuleScreen } from "../../src/features/modules/ModuleScreen";
import { ModuleHub } from "../../src/features/modules/hub/ModuleHub";
import type { ModuleSlug } from "../../src/shared/shell/module-catalog";
import { usePathname } from "./navigation";
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
  if (path.startsWith("/forms/"))
    return (
      <>
        <PublicForm token={path.split("/")[2] ?? ""} />
        <p className="test-notice">
          Explicit local test fixture · synthetic form
        </p>
      </>
    );
  if (path === "/meri")
    return (
      <ProductShell>
        <MeriHome />
      </ProductShell>
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
  const module = path.startsWith("/modules/") ? (
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
            {isSettings ? (
              <SettingsScreen section={path.split("/")[2]} />
            ) : path.startsWith("/modules") ? (
              module
            ) : (
              <SessionProbe />
            )}
          </CapiroBoundary>
        )}
      </ModuleShell>
      <p className="test-notice">
        Explicit local test fixture · synthetic identity and records
      </p>
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
