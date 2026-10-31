"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  assertCurrentActor,
  currentActorKey,
  useCurrentActor,
} from "@/shared/portfolio/auth/current-actor";
import { portfolioMetricFreshness, portfolioMetricsFor } from "./metrics";
/**
 * The metrics read is expensive and unrelated to the catalogue filters. Search typing
 * re-renders the index (and can remount this subtree), so the query serves cache inside
 * one refresh window instead of refetching on every mount; the 60s interval and the
 * explicit Refresh action still reload it.
 */
export function portfolioMetricsQueryOptions(
  api: ReturnType<typeof useApi>,
  actor: ReturnType<typeof useCurrentActor>,
  cache: ReturnType<typeof useQueryClient>,
) {
  return {
    queryKey: ["portfolio", "baseline-metrics", currentActorKey(actor)],
    enabled: Boolean(actor),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      if (!actor) throw Error("Current account required");
      assertCurrentActor(cache, actor);
      const result = await api.request(
        "core",
        "clients/metrics",
        portfolioMetricsFor(actor.tenantId),
        { signal },
      );
      signal.throwIfAborted();
      assertCurrentActor(cache, actor);
      return result;
    },
  };
}
export function usePortfolioMetrics() {
  const api = useApi(),
    actor = useCurrentActor(),
    cache = useQueryClient();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery(portfolioMetricsQueryOptions(api, actor, cache));
  const data =
    actor && query.isFetchedAfterMount && !query.error ? query.data : undefined;
  return {
    data,
    pending: Boolean(actor && query.isPending),
    stale: data ? portfolioMetricFreshness(data, now) === "stale" : false,
    refresh: () => void query.refetch(),
  };
}
