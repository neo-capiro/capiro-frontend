"use client";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  assertCurrentActor,
  currentActorKey,
  useCurrentActor,
  type CurrentActor,
} from "@/shared/portfolio/auth/current-actor";
import { z } from "zod";
import { clientSchema } from "@/shared/session/client-contract";

/**
 * The read's own receipt: the requested client, and — when the row carries it — the
 * caller's tenant. Derived from the shared client contract so this neutral module does
 * not import another Portfolio area's private files.
 */
const clientReadSchema = (clientId: string, tenantId: string) =>
  clientSchema
    .extend({ tenantId: z.string().min(1).optional() })
    .refine(
      (client) =>
        client.id === clientId &&
        (!client.tenantId || client.tenantId === tenantId),
    );

/**
 * The ONE client-detail read.
 *
 * Two surfaces used to fetch `clients/{id}` under different cache keys — the catalogue
 * hook (`["portfolio","client",id]`) and the profile panel hook
 * (`["client-profile",id,"saved-client",actor]`) — so one profile mount issued two GETs.
 * Both now resolve this module's key and options, which keeps the actor in the key (no
 * cross-actor cache bleed) without either of those modules importing the other.
 *
 * `clientKey` stays the actor-less PREFIX so every existing client write can keep
 * invalidating `clientKey(id)` and still match the actor-scoped entries underneath.
 */
export const clientKey = (id: string) => ["portfolio", "client", id] as const;

export const clientReadKey = (clientId: string, actor?: CurrentActor | null) =>
  [...clientKey(clientId), currentActorKey(actor ?? undefined)] as const;

export function clientReadQueryOptions(
  api: ReturnType<typeof useApi>,
  cache: QueryClient,
  clientId: string,
  actor: CurrentActor | undefined,
) {
  return {
    queryKey: clientReadKey(clientId, actor),
    // Never an unscoped key: the read is actor-admitted, so it waits for the actor.
    enabled: Boolean(actor),
    staleTime: 30_000,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      if (!actor) throw new Error("A current session is required.");
      assertCurrentActor(cache, actor);
      const client = await api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}`,
        clientReadSchema(clientId, actor.tenantId),
        { signal },
      );
      signal.throwIfAborted();
      assertCurrentActor(cache, actor);
      return client;
    },
  };
}

/** Catalogue/panel consumers share this: one cache entry per client + actor. */
export function useClientRead(clientId: string) {
  const api = useApi();
  const cache = useQueryClient();
  const actor = useCurrentActor();
  return useQuery(clientReadQueryOptions(api, cache, clientId, actor));
}
