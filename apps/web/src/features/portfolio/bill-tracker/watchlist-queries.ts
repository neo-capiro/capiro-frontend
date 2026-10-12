"use client";
import { useCallback, useSyncExternalStore } from "react";
import { notifyManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import {
  profileReadKey,
  useProfileClient,
} from "@/features/portfolio/client-profile/read-public";
import { fetchJurisdictions } from "./api";
import { taxonomySchema } from "./watchlist-contracts";
import {
  assertWatchlistReader,
  currentWatchlistReader,
  currentWatchlistView,
  jurisdictionsKey,
  taxonomyKey,
  watchlistKey,
  watchlistReaderKey,
} from "./watchlist-source";
import { readWatchlist } from "./watchlist-writer";

/** Only current successful sources participate in this editor's combined read. */
export function useWatchlistView(clientId: string, backend: TrackerBackend) {
  const api = useApi();
  const cache = useQueryClient();
  const client = useProfileClient(clientId);
  const subscribe = useCallback(
    (notify: () => void) => {
      const batched = notifyManager.batchCalls(notify);
      return cache.getQueryCache().subscribe((event) => {
        if (
          [
            "identity",
            "client-profile",
            "bill-watchlist",
            "tracker-issue-areas",
            "watchlist-jurisdictions",
          ].includes(String(event.query.queryKey[0]))
        )
          batched();
      });
    },
    [cache],
  );
  const snapshot = useCallback(() => {
    const reader = currentWatchlistReader(cache);
    const keys = [
      profileReadKey(clientId, "saved-client", reader?.actor),
      watchlistKey(clientId, backend, reader),
      taxonomyKey(backend, reader),
      ...(backend === "intelligence" ? [jurisdictionsKey(reader)] : []),
    ];
    return JSON.stringify([
      watchlistReaderKey(reader),
      ...keys.map((key) => {
        const state = cache.getQueryState(key);
        return (
          state && [
            state.status,
            state.fetchStatus,
            state.isInvalidated,
            state.dataUpdateCount,
            state.errorUpdateCount,
            Boolean(state.error),
          ]
        );
      }),
    ]);
  }, [cache, clientId, backend]);
  useSyncExternalStore(subscribe, snapshot, () => "");
  const reader = currentWatchlistReader(cache);
  const assertReader = () => {
    if (!reader) throw new ApiError(403, "A current session is required.");
    assertWatchlistReader(cache, reader);
  };
  const targeting = useQuery({
    queryKey: watchlistKey(clientId, backend, reader),
    enabled: Boolean(reader && client.source),
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      assertReader();
      const result = await readWatchlist(api, clientId, backend, signal);
      signal.throwIfAborted();
      assertReader();
      return result;
    },
  });
  const taxonomy = useQuery({
    queryKey: taxonomyKey(backend, reader),
    enabled: Boolean(reader && client.source),
    queryFn: async ({ signal }) => {
      assertReader();
      const result = await api.request(
        backend,
        backend === "core" ? "intelligence/issue-areas" : "tracker/issue-areas",
        taxonomySchema,
        { signal },
      );
      signal.throwIfAborted();
      assertReader();
      return result;
    },
  });
  const coverage = useQuery({
    queryKey: jurisdictionsKey(reader),
    enabled: Boolean(reader && client.source && backend === "intelligence"),
    queryFn: async ({ signal }) => {
      assertReader();
      const result = await fetchJurisdictions(api, signal);
      signal.throwIfAborted();
      assertReader();
      return result;
    },
  });
  return {
    reader,
    view: currentWatchlistView(cache, clientId, backend),
    pending:
      Boolean(reader) &&
      (client.isFetching ||
        targeting.isFetching ||
        taxonomy.isFetching ||
        (backend === "intelligence" && coverage.isFetching)),
    error:
      client.error ??
      targeting.error ??
      taxonomy.error ??
      (backend === "intelligence" ? coverage.error : undefined),
    refresh: async () => {
      assertReader();
      const result = await client.refetch();
      assertReader();
      if (result.isSuccess)
        await Promise.all([
          targeting.refetch(),
          taxonomy.refetch(),
          ...(backend === "intelligence" ? [coverage.refetch()] : []),
        ]);
    },
  };
}
