"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { assertProfileActor, useProfileActor } from "./profile-access";
import { profileReadKey } from "./profile-keys";
import {
  profileClientSchema,
  profileMemberOptionsSchema,
} from "./profile-receipts";
import { currentProfileSource } from "./profile-source";

/**
 * The client detail read. Cache-first (one refresh window) because the drawer has
 * already loaded this record before a panel is opened over it.
 */
export function profileClientQueryOptions(
  api: ReturnType<typeof useApi>,
  cache: ReturnType<typeof useQueryClient>,
  clientId: string,
  actor: ReturnType<typeof useProfileActor>,
) {
  const queryKey = profileReadKey(clientId, "saved-client", actor);
  return {
    queryKey,
    enabled: Boolean(actor),
    staleTime: 30_000,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      if (!actor) throw new Error("A current session is required.");
      assertProfileActor(cache, actor);
      const client = await api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}`,
        profileClientSchema(clientId, actor.tenantId),
        { signal },
      );
      signal.throwIfAborted();
      assertProfileActor(cache, actor);
      return client;
    },
  };
}
export function useProfileClient(clientId: string) {
  const actor = useProfileActor();
  const cache = useQueryClient();
  const api = useApi();
  const options = profileClientQueryOptions(api, cache, clientId, actor);
  const query = useQuery(options);
  return {
    ...query,
    data: actor && query.isSuccess && !query.error ? query.data : undefined,
    source: actor ? currentProfileSource(cache, options.queryKey) : undefined,
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
