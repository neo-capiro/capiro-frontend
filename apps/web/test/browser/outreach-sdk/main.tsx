import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "../../../src/shared/capiro/CapiroBoundary";
import { SessionContext } from "../../../src/shared/session/SessionContext";
import { ModuleShell } from "../../../src/shared/shell/ModuleShell";
import { EngagementScreen } from "../../../src/features/modules/engagement/EngagementScreen";
import "../../../src/app/globals.css";
import "../font.css";
createRoot(document.getElementById("root")!).render(
  <SessionContext.Provider value="signed-in">
    <CapiroDataProvider onSessionExpired={() => window.location.reload()}>
      <ModuleShell active="engagement">
        <EngagementScreen />
      </ModuleShell>
      <aside className="test-notice">
        Synthetic UI integration · no model or email provider
      </aside>
    </CapiroDataProvider>
  </SessionContext.Provider>,
);
