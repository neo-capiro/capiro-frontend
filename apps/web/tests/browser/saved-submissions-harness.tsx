import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { DataProvider } from "@/shared/portfolio/api/provider";
import { createApiClient, type ApiClient } from "@/shared/portfolio/api/http";
import { PastPerformance } from "@/features/portfolio/client-profile/past-performance/public";
import { clientId } from "./fixtures";
import { actorId, tenantId } from "./overview-removal-fixtures";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";
import "./test-font.css";

type Source = "history" | "client" | "identity";
const listeners = new Set<() => void>();
let pending = 0;
const nativeApi = createApiClient();
const api: ApiClient = {
  async request(...args) {
    pending += 1;
    for (const listener of listeners) listener();
    try {
      return await nativeApi.request(...args);
    } finally {
      pending -= 1;
      for (const listener of listeners) listener();
    }
  },
};

declare global {
  interface Window {
    __savedSubmissions?: {
      refresh: (source: Source) => Promise<void>;
      invalidate: (source: Source, restore?: boolean) => void;
      replaceHistory: (rows: unknown[]) => void;
      actor: (replace: boolean) => void;
      show: (visible: boolean) => void;
      snapshots: () => {
        key: readonly unknown[];
        invalidated: boolean;
        status: string;
        revision: number;
      }[];
    };
  }
}

function SavedSubmissionsHarness() {
  const cache = useQueryClient();
  const [shown, setShown] = useState(true);
  const pendingCount = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    () => pending,
  );
  useEffect(() => {
    const matches = (source: Source) => (query: Query) =>
      source === "identity"
        ? query.queryKey[0] === "identity"
        : source === "history"
          ? query.queryKey[0] === "client-submissions"
          : (query.queryKey[0] === "client-profile" &&
              query.queryKey[2] === "saved-client") ||
            (query.queryKey[0] === "portfolio" &&
              query.queryKey[1] === "client");
    window.__savedSubmissions = {
      refresh: (source) => cache.refetchQueries({ predicate: matches(source) }),
      invalidate: (source, restore = false) => {
        const snapshots = cache
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
          for (const snapshot of snapshots)
            cache.setQueryData(snapshot.key, snapshot.data);
      },
      replaceHistory: (rows) => {
        for (const query of cache
          .getQueryCache()
          .findAll({ predicate: matches("history") }))
          cache.setQueryData(query.queryKey, rows);
      },
      actor: (replace) =>
        cache.setQueryData(["identity"], {
          user: {
            id: replace ? "a1000000-0000-4000-8000-000000000009" : actorId,
            email: "test@example.test",
          },
          tenant: { id: tenantId, name: "Synthetic tenant" },
          role: "user_admin",
        }),
      show: setShown,
      snapshots: () =>
        cache
          .getQueryCache()
          .findAll({ predicate: matches("history") })
          .map((query) => ({
            key: query.queryKey,
            invalidated: query.state.isInvalidated,
            status: query.state.status,
            revision: query.state.dataUpdateCount,
          })),
    };
    return () => {
      delete window.__savedSubmissions;
    };
  }, [cache]);
  return (
    <main
      data-portfolio-root
      style={{
        width: "min(1024px, calc(100vw - 32px))",
        margin: "16px auto",
      }}
    >
      {shown ? (
        <PastPerformance
          clientId={clientId}
          clientName="Stale supplied client name"
        />
      ) : (
        <p>Saved-submission view unmounted</p>
      )}
      <output hidden aria-label="Synthetic saved-submission requests pending">
        {pendingCount}
      </output>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <DataProvider api={api}>
    <SavedSubmissionsHarness />
  </DataProvider>,
);
