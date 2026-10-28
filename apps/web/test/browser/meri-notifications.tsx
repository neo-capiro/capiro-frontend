import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ApplicationBoundary } from "../../src/shared/session/ApplicationBoundary";
import { RequireSession } from "../../src/shared/session/SessionContext";
import { NotificationsHost } from "../../src/features/meri/notifications/NotificationsHost";

const host = (
  <ApplicationBoundary publishableKey="pk_test_YQ==">
    <RequireSession>
      <NotificationsHost unavailable="Synthetic optional notice source unavailable." />
    </RequireSession>
  </ApplicationBoundary>
);
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).has("strict") ? (
    <StrictMode>{host}</StrictMode>
  ) : (
    host
  ),
);
