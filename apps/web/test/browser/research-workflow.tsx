import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useRouter, useSearchParams } from "next/navigation";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { DataProvider } from "../../src/shared/portfolio/api/provider";
import { ResearchCreateAction } from "../../src/features/modules/research-portfolios/ResearchCreate";
import { ResearchPortfolioDetail } from "../../src/features/modules/research-portfolios/ResearchDetail";
import { readResearchPortfolioView } from "../../src/features/modules/research-portfolios/research-navigation";
import { ids } from "./research-sharing-fixture";
import "../../src/app/globals.css";
import "../../src/shared/portfolio/styles.css";
import "./font.css";
function Fixture() {
  const search = useSearchParams();
  const router = useRouter();
  return (
    <CapiroDataProvider
      key={search.get("scope") ?? "default"}
      onSessionExpired={() => undefined}
    >
      {search.get("mode") === "create" ? (
        <DataProvider>
          <ResearchCreateAction
            onCreated={(id) =>
              router.push(`/research-workflow.html?created=${id}`)
            }
          />
        </DataProvider>
      ) : (
        <ResearchPortfolioDetail
          id={search.get("portfolioId") ?? ids.portfolio}
          view={readResearchPortfolioView(search.get("view"))}
          onView={(view) => router.push(`/research-workflow.html?view=${view}`)}
          onBack={() => undefined}
        />
      )}
    </CapiroDataProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
