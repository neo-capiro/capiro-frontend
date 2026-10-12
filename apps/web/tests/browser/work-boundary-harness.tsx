import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { PortfolioHarnessProviders } from "./portfolio-harness-providers";
import { WorkPage } from "@/features/portfolio/work/WorkPage";
import { clientKey, clientsKey } from "@/features/portfolio/index/public";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

type WorkSource = "summaries" | "details" | "documents" | "client" | "clients";

declare global {
  interface Window {
    __workBoundary?: {
      refresh: (source: WorkSource) => Promise<void>;
      changeClient: (clientId: string) => void;
      remount: () => void;
      snapshots: () => {
        key: readonly unknown[];
        status: string;
        retained: boolean;
      }[];
    };
  }
}

function WorkBoundaryHarness() {
  const cache = useQueryClient();
  const missingDestinations = new URLSearchParams(location.search).has(
    "missing-destinations",
  );
  const [clientId, setClientId] = useState(
    "10000000-0000-4000-8000-000000000001",
  );
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const keys = {
      summaries: ["strategies", clientId],
      details: ["strategy-detail"],
      documents: ["workspace-drafts"],
      client: clientKey(clientId),
      clients: clientsKey,
    };
    window.__workBoundary = {
      refresh: (source) => cache.invalidateQueries({ queryKey: keys[source] }),
      changeClient: setClientId,
      remount: () => setRevision((value) => value + 1),
      snapshots: () =>
        cache
          .getQueryCache()
          .getAll()
          .map((query) => ({
            key: query.queryKey,
            status: query.state.status,
            retained: query.state.data !== undefined,
          })),
    };
    return () => {
      delete window.__workBoundary;
    };
  }, [cache, clientId]);
  return (
    <WorkPage
      key={revision}
      clientId={clientId}
      destinations={
        missingDestinations
          ? {}
          : {
              existingApp: "http://127.0.0.1:5191/existing",
              workspace: "http://127.0.0.1:5191/existing/workspace",
            }
      }
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <PortfolioHarnessProviders>
    <WorkBoundaryHarness />
  </PortfolioHarnessProviders>,
);
