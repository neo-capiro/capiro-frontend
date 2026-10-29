"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  useQueryClient,
  notifyManager,
  type QueryClient,
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

export type CurrentActor = ClientWriter & { role: string };
export function currentActor(cache: QueryClient): CurrentActor | undefined {
  const actor = currentClientWriter(cache);
  const identity = identitySchema.safeParse(cache.getQueryData(["identity"]));
  if (actor && identity.success && identity.data.role)
    return { ...actor, role: identity.data.role };
}
export const currentActorKey = (actor?: CurrentActor) =>
  actor
    ? JSON.stringify([actor.tenantId, actor.userId, actor.role])
    : "unavailable";
export function assertCurrentActor(
  cache: QueryClient,
  actor: CurrentActor,
  admin = false,
) {
  assertClientWriter(cache, actor);
  const current = currentActor(cache);
  if (
    currentActorKey(current) !== currentActorKey(actor) ||
    (admin && !canAdminister(current?.role))
  )
    throw new ApiError(
      403,
      "Your current session cannot change this profile section.",
    );
}
export function useCurrentActor() {
  const cache = useQueryClient();
  const token = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          if (event.query.queryKey[0] === "identity") notify();
        }),
      ),
    () => currentActorKey(currentActor(cache)),
    () => "unavailable",
  );
  return useMemo(
    () => (token === "unavailable" ? undefined : currentActor(cache)),
    [cache, token],
  );
}
