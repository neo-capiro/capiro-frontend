"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { activitySchema } from "./contracts";
import { assertProfileActor, useProfileActor } from "./profile-access";
import { profileKey, profileReadKey } from "./profile-keys";
import { profileFacilityList, profileTeamSchema } from "./profile-receipts";
import { currentProfileSource } from "./profile-source";
export { profileKey } from "./profile-keys";
export function useActivity(clientId: string) {
  const api = useApi();
  return useQuery({
    queryKey: profileKey(clientId, "activity"),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `clients/${clientId}/activity?limit=500`,
        z.array(activitySchema),
        { signal },
      ),
  });
}
export function useFacilities(clientId: string) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useProfileActor();
  const queryKey = profileReadKey(clientId, "facilities", actor);
  const query = useQuery({
    queryKey,
    enabled: Boolean(actor),
    queryFn: async ({ signal }) => {
      if (!actor) throw new Error("A current session is required.");
      assertProfileActor(cache, actor);
      const facilities = await api.request(
        "core",
        `clients/${clientId}/facilities`,
        profileFacilityList(clientId, actor.tenantId),
        { signal },
      );
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return facilities;
    },
    refetchInterval: (query) =>
      query.state.data?.some(
        (f) =>
          f.geocodeStatus === "pending" ||
          (f.geocodeNextAttemptAt &&
            new Date(f.geocodeNextAttemptAt).getTime() >=
              Date.now() - 120_000 &&
            new Date(f.geocodeNextAttemptAt).getTime() <= Date.now() + 30_000),
      )
        ? 5000
        : false,
  });
  return {
    ...query,
    data: actor && query.isSuccess && !query.error ? query.data : undefined,
    source: actor ? currentProfileSource(cache, queryKey) : undefined,
  };
}
export function useTeam(clientId: string) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useProfileActor();
  const queryKey = profileReadKey(clientId, "team", actor);
  const query = useQuery({
    queryKey,
    enabled: Boolean(actor),
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      if (!actor) throw new Error("A current session is required.");
      assertProfileActor(cache, actor);
      const team = await api.request(
        "core",
        `clients/${clientId}/team`,
        profileTeamSchema,
        { signal },
      );
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return team;
    },
  });
  return {
    ...query,
    data: actor && query.isSuccess && !query.error ? query.data : undefined,
    source: actor ? currentProfileSource(cache, queryKey) : undefined,
  };
}
