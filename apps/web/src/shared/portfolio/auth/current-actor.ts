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
/**
 * The ADMITTED READ identity.
 *
 * `currentActor` goes through currentClientWriter, which correctly refuses while identity is
 * fetching or invalidated: that is the WRITE guard. Reading a client that this same actor was
 * already admitted to must not disappear because identity is briefly revalidating, so the read
 * identity tolerates a transient refetch of the same cached identity while still refusing an
 * errored, absent, invalidated-without-data or different identity.
 */
export function currentReadActor(cache: QueryClient): CurrentActor | undefined {
  const state = cache.getQueryState(["identity"]);
  const identity = identitySchema.safeParse(cache.getQueryData(["identity"]));
  if (
    !state ||
    state.status !== "success" ||
    state.error ||
    !identity.success ||
    !identity.data.user.id.trim() ||
    !identity.data.tenant?.id.trim() ||
    !identity.data.role ||
    !["standard_user", "user_admin", "capiro_admin"].includes(
      identity.data.role,
    )
  )
    return;
  return {
    userId: identity.data.user.id,
    tenantId: identity.data.tenant.id,
    role: identity.data.role,
  };
}

export const currentActorKey = (actor?: CurrentActor) =>
  actor
    ? JSON.stringify([actor.tenantId, actor.userId, actor.role])
    : "unavailable";
/** The read-side counterpart of assertCurrentActor: refuses a different or absent actor. */
export function assertCurrentReadActor(
  cache: QueryClient,
  actor: CurrentActor,
): void {
  const current = currentReadActor(cache);
  if (currentActorKey(current) !== currentActorKey(actor))
    throw new ApiError(
      403,
      "Your current session cannot change this profile section.",
    );
}

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
    () => currentActorKey(currentReadActor(cache)),
    () => "unavailable",
  );
  return useMemo(
    () => (token === "unavailable" ? undefined : currentReadActor(cache)),
    [cache, token],
  );
}
