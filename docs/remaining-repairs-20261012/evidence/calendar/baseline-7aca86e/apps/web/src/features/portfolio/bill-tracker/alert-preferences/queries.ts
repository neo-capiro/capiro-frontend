"use client";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import { assertAlertActor, type AlertActor } from "./access";
import {
  alertPreferencesSchema,
  preferenceSignature,
  type AlertPreferences,
} from "./contracts";

export const alertPreferencesPath = (clientId: string) =>
  `tracker/watchlists/${encodeURIComponent(clientId)}/alert-prefs`;
export const alertPreferencesKey = (clientId: string, actor: AlertActor) =>
  [
    "bill-alert-preferences",
    "intelligence",
    actor.tenantId,
    actor.userId,
    actor.clerkUserId,
    clientId,
  ] as const;

export function useAlertPreferences(clientId: string, actor: AlertActor) {
  const api = useApi();
  const cache = useQueryClient();
  return useQuery({
    queryKey: alertPreferencesKey(clientId, actor),
    queryFn: async ({ signal }) => {
      assertAlertActor(cache, actor);
      const record = await api.request(
        "intelligence",
        alertPreferencesPath(clientId),
        alertPreferencesSchema({ ...actor, clientId }),
        { signal },
      );
      signal.throwIfAborted();
      assertAlertActor(cache, actor);
      return record;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
}
export type AlertPreferencesSource = ReturnType<typeof useAlertPreferences>;

export function assertPreferenceSource(
  cache: QueryClient,
  clientId: string,
  actor: AlertActor,
  baseline: AlertPreferences,
) {
  assertAlertActor(cache, actor);
  const key = alertPreferencesKey(clientId, actor);
  const state = cache.getQueryState<AlertPreferences>(key);
  const record = alertPreferencesSchema({ ...actor, clientId }).safeParse(
    state?.data,
  );
  if (
    state?.status !== "success" ||
    state.error ||
    state.isInvalidated ||
    state.fetchStatus !== "idle" ||
    !record.success ||
    preferenceSignature(record.data) !== preferenceSignature(baseline)
  )
    throw new ApiError(
      409,
      "Reload saved preferences before saving these changes.",
    );
  return state.dataUpdateCount;
}
