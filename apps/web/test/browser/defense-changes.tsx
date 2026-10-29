import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useSearchParams } from "next/navigation";
import { DataProvider } from "../../src/shared/portfolio/api/provider";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { SelectedClientProvider } from "../../src/shared/session/SelectedClient";
import { ChangesWorkspace } from "../../src/features/modules/intelligence/changes/ChangesWorkspace";
import "../../src/app/globals.css";
import "./font.css";
function Fixture() {
  const params = useSearchParams();
  return (
    <DataProvider>
      <SelectedClientProvider requestedId={params.get("clientId") || undefined}>
        <CapiroDataProvider onSessionExpired={() => undefined}>
          <ChangesWorkspace />
        </CapiroDataProvider>
      </SelectedClientProvider>
    </DataProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
