import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useSearchParams } from "next/navigation";
import { ApplicationBoundary } from "../../../src/shared/session/ApplicationBoundary";
import { RequireSession } from "../../../src/shared/session/SessionContext";
import { NewsletterDestination } from "../../../src/features/modules/engagement/NewsletterDestination";
import { newsletterDestination } from "../../../src/features/modules/engagement/newsletter-route";
import "../../../src/app/globals.css";
import "../font.css";

// Match Next's documented native-history/useSearchParams integration in this Vite fixture.
const replace = window.history.replaceState.bind(window.history);
window.history.replaceState = (...args) => {
  replace(...args);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
function Route() {
  const params = useSearchParams();
  const destination = newsletterDestination(new URLSearchParams(params));
  return destination.kind === "none" ? (
    <p>Outreach fixture</p>
  ) : (
    <NewsletterDestination destination={destination} />
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <p>Synthetic local fixture</p>
    <ApplicationBoundary publishableKey="pk_test_YQ==">
      <RequireSession>
        <Route />
      </RequireSession>
    </ApplicationBoundary>
  </StrictMode>,
);
