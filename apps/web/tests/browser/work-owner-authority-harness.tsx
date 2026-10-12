import { createRoot } from "react-dom/client";
import { usePathname } from "next/navigation";
import { ApplicationBoundary } from "@/shared/session/ApplicationBoundary";
import { RequireSession } from "@/shared/session/SessionContext";
import { SelectedClientGate } from "@/shared/session/SelectedClient";
import { WorkPage } from "@/features/portfolio/work/WorkPage";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

// The existing Modules Clerk double supplies identity changes. Production
// ApplicationBoundary owns all cache/transport/client lifetime replacement.
history.replaceState(
  {},
  "",
  "/portfolio/10000000-0000-4000-8000-000000000001/work",
);

function WorkOwnerAuthorityHarness() {
  const clientId = usePathname().split("/")[2]!;
  return (
    <ApplicationBoundary publishableKey="pk_test_synthetic">
      <RequireSession>
        <SelectedClientGate>
          <WorkPage clientId={clientId} destinations={{}} />
        </SelectedClientGate>
      </RequireSession>
    </ApplicationBoundary>
  );
}

createRoot(document.getElementById("root")!).render(
  <WorkOwnerAuthorityHarness />,
);
