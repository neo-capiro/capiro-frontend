import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { usePathname } from "next/navigation";
import { ApplicationBoundary } from "../../../../../shared/session/ApplicationBoundary";
import { RequireSession } from "../../../../../shared/session/SessionContext";
import { EngagementScreen } from "../../EngagementScreen";
import { WorkspaceScreen } from "../../../workspace/WorkspaceScreen";
import "../../../../../app/globals.css";
import "../../../../../../test/browser/font.css";

function ReceivingRoute() {
  return usePathname().startsWith("/modules/workspace") ? (
    <WorkspaceScreen />
  ) : (
    <EngagementScreen />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <p>Synthetic local fixture</p>
    <ApplicationBoundary publishableKey="pk_test_YQ==">
      <RequireSession>
        <ReceivingRoute />
      </RequireSession>
    </ApplicationBoundary>
  </StrictMode>,
);
