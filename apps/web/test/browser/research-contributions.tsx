import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CapiroDataProvider } from "../../src/shared/capiro/CapiroBoundary";
import { ResearchAnalytics } from "../../src/features/modules/research-portfolios/ResearchAnalytics";
import { ResearchReviews } from "../../src/features/modules/research-portfolios/ResearchReviews";
import { ids, portfolio } from "./research-sharing-fixture";
import "../../src/app/globals.css";
import "../../src/shared/portfolio/styles.css";
import "./font.css";
const view = new URLSearchParams(location.search).get("view");
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CapiroDataProvider onSessionExpired={() => undefined}>
      {view === "reviews" ? (
        <ResearchReviews portfolio={portfolio} onReload={() => undefined} />
      ) : (
        <ResearchAnalytics id={ids.portfolio} />
      )}
    </CapiroDataProvider>
  </StrictMode>,
);
