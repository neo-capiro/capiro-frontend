import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useSearchParams } from "next/navigation";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { ResearchWorkspace } from "../../src/features/modules/intelligence/research/ResearchWorkspace";
import { ResearchCoverage } from "../../src/features/modules/intelligence/research/ResearchCoverage";
import { EvidenceList } from "../../src/features/modules/intelligence/research/ResearchEvidence";
import "../../src/app/globals.css";
import "./font.css";
function Fixture() {
  const params = useSearchParams();
  return (
    <CapiroDataProvider onSessionExpired={() => undefined}>
      {params.get("view") === "evidence" ? (
        <EvidenceList
          items={[
            {
              evidenceRefId:
                "context-occurrence:20000000-0000-4000-8000-000000000001",
              sourceDocumentId: "synthetic-document",
              sourceRevisionId: "synthetic-revision",
              sourceFamily: "hearing",
              publisher: "Synthetic publisher",
              sourceUrl: "https://example.test/source",
              nativeLocator: {
                page: 2,
                section: "Section A",
                occurrenceId: "20000000-0000-4000-8000-000000000001",
              },
              contentHash: "synthetic-original-hash",
              edition: "1",
              observedAt: "2026-10-27T00:00:00Z",
            },
          ]}
        />
      ) : params.get("view") === "coverage" ? (
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
