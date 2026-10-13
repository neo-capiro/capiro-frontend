"use client";
import { useCallback, useSyncExternalStore } from "react";
import {
  notifyManager,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  assertClientWriter,
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import {
  canAdminister,
  identitySchema,
} from "@/shared/portfolio/auth/identity";

export type AdvocacyActor = ClientWriter & { role: string };
export function currentAdvocacyActor(
  cache: QueryClient,
): AdvocacyActor | undefined {
  const actor = currentClientWriter(cache);
  const identity = identitySchema.safeParse(cache.getQueryData(["identity"]));
  if (actor && identity.success && identity.data.role)
    return { ...actor, role: identity.data.role };
}
export function assertMatterEditor(cache: QueryClient, actor: AdvocacyActor) {
  assertClientWriter(cache, actor);
  const current = currentAdvocacyActor(cache);
  if (!current || !canAdminister(current.role) || current.role !== actor.role)
    throw new ApiError(
      403,
      "Your current role cannot edit this advocacy matter.",
    );
}
/** Interrupt active work synchronously, even if authority is restored before React renders. */
export function watchMatterEditor(
  cache: QueryClient,
  actor: AdvocacyActor,
  onInterrupted: () => void,
) {
  return cache.getQueryCache().subscribe((event) => {
    if (event.query.queryKey[0] !== "identity") return;
    try {
      assertMatterEditor(cache, actor);
    } catch {
      onInterrupted();
    }
  });
}
export function currentAdvocacyRead(cache: QueryClient, key: QueryKey) {
  const state = cache.getQueryState(key);
  return (
    state?.status === "success" &&
    !state.error &&
    !state.isInvalidated &&
    state.fetchStatus === "idle"
  );
}
export const scopedAdvocacyKey = (
  key: QueryKey,
  actor: ClientWriter | undefined,
) => [...key, actor?.tenantId, actor?.userId] as const;

/** Observe invalidation and retained-error states, including imperative cache updates. */
export function useAdvocacyRevision(clientId: string) {
  const cache = useQueryClient();
  const relevant = useCallback(
    (key: QueryKey) =>
      key[0] === "identity" || (key[0] === "advocacy" && key[1] === clientId),
    [clientId],
  );
  const subscribe = useCallback(
    (notify: () => void) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          if (relevant(event.query.queryKey)) notify();
        }),
      ),
    [cache, relevant],
  );
  const snapshot = useCallback(
    () =>
      JSON.stringify(
        cache
          .getQueryCache()
          .getAll()
          .filter((query) => relevant(query.queryKey))
          .map(({ queryHash, state }) => [
            queryHash,
            state.status,
            state.fetchStatus,
            state.isInvalidated,
            state.dataUpdateCount,
            state.errorUpdateCount,
          ])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      ),
    [cache, relevant],
  );
  useSyncExternalStore(subscribe, snapshot, () => "[]");
  return cache;
}
