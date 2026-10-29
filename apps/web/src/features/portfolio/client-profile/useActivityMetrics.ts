"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  assertProfileActor,
  profileActorKey,
  useProfileActor,
} from "./profile-access";
import { profileKey } from "./profile-keys";
import {
  activityMetricsFreshness,
  scopedActivityMetrics,
} from "./activity-metrics";

export function useActivityMetrics(clientId: string) {
  const api = useApi(),
    cache = useQueryClient(),
    actor = useProfileActor();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: [
      ...profileKey(clientId, "activity"),
      "metrics",
      profileActorKey(actor),
    ],
    enabled: Boolean(actor),
    refetchOnMount: "always",
    refetchInterval: 60000,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!actor) throw new Error("A current session is required.");
      assertProfileActor(cache, actor);
      const result = await api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}/activity/metrics`,
        scopedActivityMetrics(actor.tenantId, clientId),
        { signal },
      );
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return result;
    },
  });
  const data =
    actor && query.isFetchedAfterMount && query.isSuccess && !query.error
      ? query.data
      : undefined;
  return {
    data,
    pending: Boolean(actor && query.isPending),
    refresh: () => void query.refetch(),
    stale: data ? activityMetricsFreshness(data, now) === "stale" : false,
  };
}
export type ActivityMetricsView = ReturnType<typeof useActivityMetrics>;
