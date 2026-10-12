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

export type ProfileActor = ClientWriter & { role: string };
export function currentProfileActor(
  cache: QueryClient,
): ProfileActor | undefined {
  const actor = currentClientWriter(cache);
  const identity = identitySchema.safeParse(cache.getQueryData(["identity"]));
  if (actor && identity.success && identity.data.role)
    return { ...actor, role: identity.data.role };
}
export const profileActorKey = (actor?: ProfileActor) =>
  actor
    ? JSON.stringify([actor.tenantId, actor.userId, actor.role])
    : "unavailable";
export function assertProfileActor(
  cache: QueryClient,
  actor: ProfileActor,
  admin = false,
) {
  assertClientWriter(cache, actor);
  const current = currentProfileActor(cache);
  if (
    profileActorKey(current) !== profileActorKey(actor) ||
    (admin && !canAdminister(current?.role))
  )
    throw new ApiError(
      403,
      "Your current session cannot change this profile section.",
    );
}
export function useProfileActor() {
  const cache = useQueryClient();
  const token = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          if (event.query.queryKey[0] === "identity") notify();
        }),
      ),
    () => profileActorKey(currentProfileActor(cache)),
    () => "unavailable",
  );
  return useMemo(
    () => (token === "unavailable" ? undefined : currentProfileActor(cache)),
    [cache, token],
  );
}
