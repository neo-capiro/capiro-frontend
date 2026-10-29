import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useSearchParams } from "next/navigation";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { DataExplorer } from "../../src/features/modules/intelligence/DataExplorer";
import { DefenseBudget } from "../../src/features/modules/intelligence/DefenseBudget";
import "../../src/app/globals.css";
import "./font.css";
function Fixture() {
  const params = useSearchParams();
  return (
    <CapiroDataProvider onSessionExpired={() => undefined}>
      {params.get("view") === "defense" ? <DefenseBudget /> : <DataExplorer />}
    </CapiroDataProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
