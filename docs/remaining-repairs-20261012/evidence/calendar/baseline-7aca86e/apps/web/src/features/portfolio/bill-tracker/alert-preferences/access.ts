"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  useQueryClient,
  notifyManager,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { identitySchema } from "@/shared/portfolio/auth/identity";

export type AlertActor = ClientWriter & { clerkUserId: string };
export function currentAlertActor(cache: QueryClient): AlertActor | undefined {
  const actor = currentClientWriter(cache);
  const identity = identitySchema.safeParse(cache.getQueryData(["identity"]));
  const clerkUserId = identity.success
    ? identity.data.user.clerkUserId
    : undefined;
  if (!actor || !clerkUserId?.trim()) return;
  return { ...actor, clerkUserId };
}
export const alertActorKey = (actor: AlertActor) =>
  JSON.stringify([actor.tenantId, actor.userId, actor.clerkUserId]);
export function assertAlertActor(cache: QueryClient, actor: AlertActor) {
  const current = currentAlertActor(cache);
  if (!current || alertActorKey(current) !== alertActorKey(actor))
    throw new ApiError(
      403,
      "Your current account cannot change these personal bill alerts.",
    );
}
export function useAlertActor() {
  const cache = useQueryClient();
  const token = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          if (event.query.queryKey[0] === "identity") notify();
        }),
      ),
    () => {
      const actor = currentAlertActor(cache);
      return actor ? alertActorKey(actor) : "";
    },
    () => "",
  );
  return useMemo(
    () => (token ? currentAlertActor(cache) : undefined),
    [cache, token],
  );
}
