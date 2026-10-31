"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { assertProfileActor, useProfileActor } from "./profile-access";
import { profileReadKey } from "./profile-keys";
import { clientReadQueryOptions } from "../clients/public";
import { profileMemberOptionsSchema } from "./profile-receipts";
import { currentProfileSource } from "./profile-source";

/** The profile surfaces consume the ONE shared client-detail read. */
export function useProfileClient(clientId: string) {
  const actor = useProfileActor();
  const cache = useQueryClient();
  const api = useApi();
  const options = clientReadQueryOptions(api, cache, clientId, actor);
  const query = useQuery(options);
  const queryKey = options.queryKey;
  return {
    ...query,
    data: actor && query.isSuccess && !query.error ? query.data : undefined,
    source: actor ? currentProfileSource(cache, queryKey) : undefined,
  };
}

export function useProfileMemberOptions() {
  const actor = useProfileActor();
  const cache = useQueryClient();
  const api = useApi();
  const queryKey = profileReadKey("members", "member-options", actor);
  const query = useQuery({
    queryKey,
    enabled: Boolean(actor),
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      if (!actor) throw new Error("A current session is required.");
      assertProfileActor(cache, actor);
      const members = await api.request(
        "core",
        "client-account-owners/options",
        profileMemberOptionsSchema,
        { signal },
      );
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return members;
    },
  });
  return {
    ...query,
    data: actor && query.isSuccess && !query.error ? query.data : undefined,
    source: actor ? currentProfileSource(cache, queryKey) : undefined,
  };
}
