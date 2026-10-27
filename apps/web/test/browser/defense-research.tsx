import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useSearchParams } from "next/navigation";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { ResearchWorkspace } from "../../src/features/modules/intelligence/research/ResearchWorkspace";
import { ResearchCoverage } from "../../src/features/modules/intelligence/research/ResearchCoverage";
import "../../src/app/globals.css";
import "./font.css";
function Fixture() {
  const params = useSearchParams();
  return (
    <CapiroDataProvider onSessionExpired={() => undefined}>
      {params.get("view") === "coverage" ? (
        <ResearchCoverage />
      ) : (
        <ResearchWorkspace />
      )}
    </CapiroDataProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
