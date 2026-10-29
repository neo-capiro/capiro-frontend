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
export function usePortfolioMetrics() {
  const api = useApi(),
    actor = useCurrentActor(),
    cache = useQueryClient();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ["portfolio", "baseline-metrics", currentActorKey(actor)],
    enabled: Boolean(actor),
    refetchOnMount: "always" as const,
    refetchInterval: 60000,
    retry: false,
    queryFn: async ({ signal }) => {
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
  });
  const data =
    actor && query.isFetchedAfterMount && !query.error ? query.data : undefined;
  return {
    data,
    pending: Boolean(actor && query.isPending),
    stale: data ? portfolioMetricFreshness(data, now) === "stale" : false,
    refresh: () => void query.refetch(),
  };
}
