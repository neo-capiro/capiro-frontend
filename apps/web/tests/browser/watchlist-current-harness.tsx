import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { createApiClient, type ApiClient } from "@/shared/portfolio/api/http";
import { useClient } from "@/features/portfolio/index/public";
import { WatchlistDialog } from "@/features/portfolio/bill-tracker/WatchlistDialog";
import { trackerReaderKey } from "@/features/portfolio/bill-tracker/current-data";
import { clientId } from "./fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

export type WatchlistSource =
  | "identity"
  | "client"
  | "targeting"
  | "taxonomy"
  | "jurisdictions";
const listeners = new Set<() => void>();
let pending = 0;
const nativeApi = createApiClient();
const changed = () =>
  queueMicrotask(() => listeners.forEach((notify) => notify()));
const api: ApiClient = {
  async request(...args) {
    pending += 1;
    changed();
    try {
      return await nativeApi.request(...args);
    } finally {
      pending -= 1;
      changed();
    }
  },
};

declare global {
  interface Window {
    __watchlistCurrent?: {
      refresh: (source: WatchlistSource) => Promise<void>;
      invalidate: (source: WatchlistSource, restore?: boolean) => void;
      identity: (value: unknown) => void;
      show: (value: boolean) => void;
      client: (id: string) => void;
      seedBoards: () => void;
      snapshots: () => {
        key: readonly unknown[];
        data: unknown;
        revision: number;
        invalidated: boolean;
      }[];
    };
  }
}

function Harness() {
  const cache = useQueryClient();
  const [selectedClient, setClient] = useState(clientId);
  const [shown, show] = useState(true);
  const [closed, setClosed] = useState(0);
  const [backend] = useState<"core" | "intelligence">(() =>
    new URLSearchParams(location.search).get("backend") === "core"
      ? "core"
      : "intelligence",
  );
  // The product parent already mounts the canonical client read. Keep that
  // pre-existing parent behavior while isolating the Configure view itself.
  useClient(selectedClient);
  const count = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => pending,
  );
  useEffect(() => {
    const matches = (source: WatchlistSource) => (query: Query) => {
      const key = query.queryKey;
      if (source === "identity") return key[0] === "identity";
      if (source === "client")
        return (
          (key[0] === "portfolio" && key[1] === "client") ||
          (key[0] === "client-profile" && key[2] === "saved-client")
        );
      if (source === "targeting") return key[0] === "bill-watchlist";
      if (source === "taxonomy") return key[0] === "tracker-issue-areas";
      return (
        key[0] === "bill-corpus-jurisdictions" ||
        key[0] === "watchlist-jurisdictions"
      );
    };
    cache.setQueryData(["bill-tracker", backend, selectedClient], {
      marker: "original board",
    });
    window.__watchlistCurrent = {
      refresh: (source) => cache.refetchQueries({ predicate: matches(source) }),
      invalidate: (source, restore = false) => {
        const saved = cache
          .getQueryCache()
          .findAll({ predicate: matches(source) })
          .map((query) => ({
            key: query.queryKey,
            data: structuredClone(query.state.data),
          }));
        void cache.invalidateQueries({
          predicate: matches(source),
          refetchType: "none",
        });
        if (restore)
          for (const item of saved) cache.setQueryData(item.key, item.data);
      },
      identity: (value) => cache.setQueryData(["identity"], value),
      show,
      client: setClient,
      seedBoards: () => {
        cache.setQueryData(
          ["bill-tracker", backend, selectedClient, trackerReaderKey(cache)],
          { marker: "current board" },
        );
        cache.setQueryData(
          ["bill-tracker", backend, selectedClient, "other-authority"],
          { marker: "other board" },
        );
      },
      snapshots: () =>
        cache
          .getQueryCache()
          .findAll({
            predicate: (query) =>
              query.queryKey[0] === "bill-watchlist" ||
              query.queryKey[0] === "bill-tracker",
          })
          .map((query) => ({
            key: query.queryKey,
            data: query.state.data,
            revision: query.state.dataUpdateCount,
            invalidated: query.state.isInvalidated,
          })),
    };
    return () => {
      delete window.__watchlistCurrent;
    };
  }, [backend, cache, selectedClient]);
  return (
    <main style={{ padding: 20 }}>
      <p>Synthetic Watchlist checks. Service requests are intercepted.</p>
      {shown ? (
        <WatchlistDialog
          clientId={selectedClient}
          backend={backend}
          onClose={() => {
            setClosed((value) => value + 1);
            show(false);
          }}
        />
      ) : (
        <p>Watchlist view unmounted</p>
      )}
      <output hidden aria-label="Synthetic Watchlist requests pending">
        {count}
      </output>
      <output aria-label="Synthetic Watchlist completed closes">
        {closed}
      </output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <DataProvider api={api}>
    <Harness />
  </DataProvider>,
);
