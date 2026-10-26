import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApplicationBoundary } from "../../../../../shared/session/ApplicationBoundary";
import { RequireSession } from "../../../../../shared/session/SessionContext";
import { EngagementScreen } from "../../EngagementScreen";
import "../../../../../app/globals.css";
import "../../../../../../test/browser/font.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <p>Synthetic local fixture</p>
    <ApplicationBoundary publishableKey="pk_test_YQ==">
      <RequireSession>
        <EngagementScreen />
      </RequireSession>
    </ApplicationBoundary>
  </StrictMode>,
);
