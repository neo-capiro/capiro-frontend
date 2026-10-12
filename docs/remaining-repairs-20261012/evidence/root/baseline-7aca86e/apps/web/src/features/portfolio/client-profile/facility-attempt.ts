"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { ProfileActor } from "./profile-access";

// Session-local attempt state is not a native operation ID or a durable receipt.
// It prevents close/reopen from replaying an unknown create in the same cache.
export type FacilityAttempt = {
  token: number;
  kind: "create" | "edit" | "remove";
  status: "pending" | "unknown";
};
let sequence = 0;
export const nextFacilityAttempt = () => ++sequence;
export const facilityAttemptKey = (
  clientId: string,
  actor?: ProfileActor,
  facilityId?: string,
) =>
  [
    "profile-facility-attempt",
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    clientId,
    facilityId ?? "create",
  ] as const;
export function setFacilityAttempt(
  cache: QueryClient,
  key: QueryKey,
  attempt: FacilityAttempt | null,
) {
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
}
export function unknownFacilityAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: number,
) {
  const attempt = cache.getQueryData<FacilityAttempt | null>(key);
  if (attempt?.token === token)
    setFacilityAttempt(cache, key, { ...attempt, status: "unknown" });
}
export function useFacilityAttempt(
  clientId: string,
  actor?: ProfileActor,
  facilityId?: string,
) {
  const cache = useQueryClient();
  const tenantId = actor?.tenantId;
  const userId = actor?.userId;
  const key = useMemo(
    () =>
      [
        "profile-facility-attempt",
        tenantId ?? "",
        userId ?? "",
        clientId,
        facilityId ?? "create",
      ] as const,
    [tenantId, userId, clientId, facilityId],
  );
  const encoded = JSON.stringify(key);
  const attempt = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (JSON.stringify(event.query.queryKey) === encoded) notify();
      }),
    () => cache.getQueryData<FacilityAttempt | null>(key) ?? null,
    () => null,
  );
  return { key, attempt };
}
