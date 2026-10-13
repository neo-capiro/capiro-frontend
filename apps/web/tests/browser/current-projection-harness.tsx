import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { PortfolioIndex } from "@/features/portfolio/index/PortfolioIndex";
import { ClientFrame } from "@/features/portfolio/client-profile/ClientFrame";
import { ClientOverview } from "@/features/portfolio/client-profile/ClientOverview";
import { clientId } from "./fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

const destinations = { existingApp: "http://127.0.0.1:5191/existing" };

// Only the refresh trigger is synthetic. All rendered owners and reads are real.
function CurrentProjectionHarness() {
  const cache = useQueryClient();
  const mode = new URLSearchParams(window.location.search).get("mode");
  useEffect(() => {
    const refresh = (event: Event) => {
      const source = (event as CustomEvent).detail;
      const queryKey =
        source === "activity"
          ? ["client-profile", clientId, "activity"]
          : source === "client"
            ? ["portfolio", "client", clientId]
            : ["portfolio", "clients"];
      void cache.refetchQueries({ queryKey });
    };
    window.addEventListener("projection-check-refresh", refresh);
    return () =>
      window.removeEventListener("projection-check-refresh", refresh);
  }, [cache]);
  return mode === "overview" ? (
    <ClientFrame clientId={clientId} destinations={destinations}>
      <ClientOverview clientId={clientId} />
    </ClientFrame>
  ) : (
    <PortfolioIndex destinations={destinations} />
  );
}

createRoot(document.getElementById("root")!).render(
  <DataProvider>
    <CurrentProjectionHarness />
  </DataProvider>,
);
