import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { ResearchSharing } from "../../src/features/modules/research-portfolios/share/ResearchSharing";
import { ResearchShareRecipient } from "../../src/features/modules/research-portfolios/share/ResearchShareRecipient";
import { DashboardDesigner } from "../../src/features/modules/research-portfolios/share/DashboardDesigner";
import { DashboardGrid } from "../../src/features/modules/research-portfolios/share/DashboardGrid";
import { ResearchSettings } from "../../src/features/modules/research-portfolios/ResearchSettings";
import { ClientSharingSettings } from "../../src/features/settings/ClientSharingSettings";
import type { ResearchDashboardLayout } from "../../src/shared/capiro/operations/research-share-schemas";
import { dashboard, portfolio, shareToken } from "./research-sharing-fixture";
import "../../src/app/globals.css";
import "../../src/shared/portfolio/styles.css";
import "./font.css";

function Fixture() {
  const query = new URLSearchParams(window.location.search);
  const mode = query.get("mode");
  const [saved, setSaved] = useState<ResearchDashboardLayout>();
  const [token, setToken] = useState(query.get("token") ?? shareToken);
  if (mode === "public")
    return (
      <>
        <button onClick={() => setToken("c".repeat(64))}>
          Switch synthetic token
        </button>
        <ResearchShareRecipient token={token} />
      </>
    );
  if (mode === "widgets")
    return <DashboardGrid layout={dashboard.layout} dashboard={dashboard} />;
  if (mode === "designer")
    return (
      <>
        <DashboardDesigner
          initialName="Synthetic design"
          initialLayout={dashboard.layout}
          preview={dashboard}
          busy={false}
          onCancel={() => undefined}
          onSave={(_name, layout) => setSaved(layout)}
        />
        <output data-testid="saved-layout">
          {saved && JSON.stringify(saved)}
        </output>
      </>
    );
  return (
    <CapiroDataProvider onSessionExpired={() => undefined}>
      {mode === "admin" ? (
        <ClientSharingSettings />
      ) : mode === "settings" ? (
        <ResearchSettings portfolio={portfolio} onReload={() => undefined} />
      ) : (
        <ResearchSharing
          portfolio={{
            ...portfolio,
            myRole: query.get("role") === "viewer" ? "viewer" : "owner",
          }}
        />
      )}
    </CapiroDataProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
