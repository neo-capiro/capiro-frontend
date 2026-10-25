import { useQueryClient } from "@tanstack/react-query";
import { DataProvider } from "../../src/shared/portfolio/api/provider";
import { SelectedClientProvider } from "../../src/shared/session/SelectedClient";
import { MeriActionHost } from "../../src/app/meri/actions/MeriActionHost";
import { MeriTaskUpdateHost } from "../../src/app/meri/task-updates/MeriTaskUpdateHost";
import { useSearchParams } from "./navigation";

function Revalidate() {
  const cache = useQueryClient();
  return (
    <button
      onClick={() => void cache.invalidateQueries({ queryKey: ["identity"] })}
    >
      Revalidate current account
    </button>
  );
}

/** Synthetic HTTP fixture mounting both actual task hosts and their encrypted recovery. */
export function StandaloneTaskProbe() {
  const params = useSearchParams();
  return (
    <DataProvider>
      <Revalidate />
      <SelectedClientProvider requestedId={params.get("clientId") ?? undefined}>
        {params.get("kind") === "create" ? (
          <MeriActionHost enabled />
        ) : (
          <MeriTaskUpdateHost enabled />
        )}
      </SelectedClientProvider>
    </DataProvider>
  );
}
