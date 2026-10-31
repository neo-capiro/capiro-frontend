"use client";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  clientReadKey,
  useClientRead,
} from "@/shared/portfolio/api/client-read";
import {
  assertCurrentReadActor,
  currentActorKey,
  useCurrentActor,
  type CurrentActor,
} from "@/shared/portfolio/auth/current-actor";
import { recordedActivitySchema } from "./recorded-activity-contract";

function assertClient(
  cache: QueryClient,
  clientId: string,
  actor: CurrentActor,
) {
  assertCurrentReadActor(cache, actor);
  const state = cache.getQueryState<{ id: string }>(
    clientReadKey(clientId, actor),
  );
  if (
    state?.status !== "success" ||
    state.error ||
    state.isInvalidated ||
    state.fetchStatus !== "idle" ||
    state.data?.id !== clientId
  )
    throw new ApiError(403, "Current client access is unavailable.");
  return state.dataUpdateCount;
}
export function recordedActivityQueryOptions(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  actor: CurrentActor | undefined,
  version: 1 | undefined,
  clientReady: boolean,
) {
  return {
    queryKey: [
      "client-profile",
      clientId,
      "recorded-activity",
      version ?? "off",
      currentActorKey(actor),
    ],
    enabled: version === 1 && Boolean(actor) && clientReady,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      if (version !== 1 || !actor || !clientReady)
        throw new ApiError(503, "Recorded activity is unavailable.");
      signal.throwIfAborted();
      const revision = assertClient(cache, clientId, actor);
      const value = await api.request(
        "core",
        `intelligence/clients/${encodeURIComponent(clientId)}/health-score`,
        recordedActivitySchema(clientId, actor),
        { signal },
      );
      signal.throwIfAborted();
      if (assertClient(cache, clientId, actor) !== revision)
        throw new ApiError(409, "Current client access changed.");
      return value;
    },
  };
}
export function useRecordedActivity(clientId: string, version?: 1) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useCurrentActor();
  const client = useClientRead(clientId);
  const clientReady = client.isSuccess && !client.error && !client.isFetching;
  const query = useQuery(
    recordedActivityQueryOptions(
      api,
      cache,
      clientId,
      actor,
      version,
      clientReady,
    ),
  );
  const enabled = version === 1 && Boolean(actor) && clientReady;
  return {
    pending: enabled && (query.isPending || query.isFetching),
    data:
      enabled &&
      query.isFetchedAfterMount &&
      query.isSuccess &&
      !query.error &&
      !query.isFetching
        ? query.data
        : undefined,
  };
}
