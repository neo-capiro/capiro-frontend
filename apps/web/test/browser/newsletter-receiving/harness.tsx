import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { usePathname } from "next/navigation";
import { ApplicationBoundary } from "../../../src/shared/session/ApplicationBoundary";
import { RequireSession } from "../../../src/shared/session/SessionContext";
import { EngagementScreen } from "../../../src/features/modules/engagement/EngagementScreen";
import { WorkspaceScreen } from "../../../src/features/modules/workspace/WorkspaceScreen";
import "../../../src/app/globals.css";
import "../font.css";

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
