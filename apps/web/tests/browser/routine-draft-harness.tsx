import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { CapiroDataProvider } from "@/shared/capiro/CapiroBoundary";
import { SelectedClientProvider } from "@/shared/session/SelectedClient";
import { MeriRoutinesHost } from "@/features/meri/routines/MeriRoutinesHost";

function RefreshIdentity() {
  const cache = useQueryClient();
  return (
    <button
      onClick={() => void cache.invalidateQueries({ queryKey: ["identity"] })}
    >
      Refresh synthetic identity
    </button>
  );
}

function Harness() {
  const [client, setClient] = useState("10000000-0000-4000-8000-000000000012");
  return (
    <DataProvider>
      <CapiroDataProvider onSessionExpired={() => {}}>
        <RefreshIdentity />
        <button
          onClick={() => setClient("10000000-0000-4000-8000-000000000015")}
        >
          Switch synthetic client
        </button>
        <SelectedClientProvider requestedId={client}>
          <MeriRoutinesHost enabled generalEnabled={false} />
        </SelectedClientProvider>
      </CapiroDataProvider>
    </DataProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
