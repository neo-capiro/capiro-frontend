"use client";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { TrackerBackend } from "@/shared/portfolio/config/config";
import { boardKey } from "./queries";
import { assertTrackerReader } from "./current-data";
import { trackerBase } from "./api";
import {
  materialChangesSchema,
  watchCoverageSchema,
} from "./tracker-metrics-contracts";

export function metricBoardSource(
  cache: QueryClient,
  clientId: string,
  backend: TrackerBackend,
  scope: string,
) {
  const key = [...boardKey(clientId, backend), scope];
  const query = cache.getQueryCache().find({ queryKey: key, exact: true });
  const state = query?.state;
  if (
    !scope ||
    !query ||
    state?.status !== "success" ||
    state.error ||
    state.isInvalidated ||
    state.fetchStatus !== "idle"
  )
    return;
  return { key, query, revision: state.dataUpdateCount };
}
type BoardSource = NonNullable<ReturnType<typeof metricBoardSource>>;
function assertSource(
  cache: QueryClient,
  clientId: string,
  backend: TrackerBackend,
  scope: string,
  source: BoardSource,
) {
  assertTrackerReader(cache, scope);
  const current = metricBoardSource(cache, clientId, backend, scope);
  if (
    !current ||
    current.query !== source.query ||
    current.revision !== source.revision
  )
    throw new ApiError(
      409,
      "Current tracked bills changed or are unavailable.",
    );
}
export function trackerMetricOptions(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  backend: TrackerBackend,
  scope: string,
  version: 1 | undefined,
  source: BoardSource | undefined,
) {
  const queryKey = [
    ...boardKey(clientId, backend),
    scope,
    "metrics",
    version ?? "off",
    source?.revision ?? "unavailable",
  ];
  const before = () => {
    if (version !== 1 || !source)
      throw new ApiError(503, "Bill Tracker metrics are unavailable.");
    assertSource(cache, clientId, backend, scope, source);
  };
  const after = (signal: AbortSignal) => {
    signal.throwIfAborted();
    before();
  };
  const options = {
    enabled: version === 1 && Boolean(source),
    retry: false,
    staleTime: 0,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  };
  return {
    material: {
      ...options,
      queryKey: [...queryKey, "material"],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        signal.throwIfAborted();
        before();
        const value = await api.request(
          backend,
          `${trackerBase(clientId, backend)}/material-changes`,
          materialChangesSchema(clientId, backend),
          { signal },
        );
        after(signal);
        return value;
      },
    },
    coverage: {
      ...options,
      queryKey: [...queryKey, "coverage"],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        signal.throwIfAborted();
        before();
        const value = await api.request(
          "core",
          `legiwatch/live-hearings/clients/${encodeURIComponent(clientId)}/coverage?trackerBackend=${backend}`,
          watchCoverageSchema(clientId, backend),
          { signal },
        );
        after(signal);
        return value;
      },
    },
  };
}
export function useTrackerMetrics(
  clientId: string,
  backend: TrackerBackend,
  scope: string,
  version: 1 | undefined,
  boardReady: boolean,
) {
  const api = useApi(),
    cache = useQueryClient();
  const source = boardReady
    ? metricBoardSource(cache, clientId, backend, scope)
    : undefined;
  const options = trackerMetricOptions(
    api,
    cache,
    clientId,
    backend,
    scope,
    version,
    source,
  );
  const material = useQuery(options.material),
    coverage = useQuery(options.coverage);
  const enabled = version === 1 && Boolean(source);
  return {
    material:
      enabled &&
      material.isFetchedAfterMount &&
      material.isSuccess &&
      !material.error &&
      !material.isFetching
        ? material.data
        : undefined,
    coverage:
      enabled &&
      coverage.isFetchedAfterMount &&
      coverage.isSuccess &&
      !coverage.error &&
      !coverage.isFetching
        ? coverage.data
        : undefined,
    materialPending: enabled && (material.isPending || material.isFetching),
    coveragePending: enabled && (coverage.isPending || coverage.isFetching),
  };
}
