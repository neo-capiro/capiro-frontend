"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  notifyManager,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { ProfileActor } from "./profile-access";
import type { FacilityAction } from "./facility-action-writer";

// Session-local uncertainty survives view changes; this is not a server receipt.
export type FacilityActionAttempt = {
  token: number;
  kind: FacilityAction["kind"];
  status: "pending" | "unknown";
};
let sequence = 0;
export const nextFacilityActionAttempt = () => ++sequence;
export const facilityActionAttemptKey = (
  clientId: string,
  actor: ProfileActor | undefined,
  facilityId: string,
) =>
  [
    "facility-address-action",
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    clientId,
    facilityId,
  ] as const;
export function setFacilityActionAttempt(
  cache: QueryClient,
  key: QueryKey,
  attempt: FacilityActionAttempt | null,
) {
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
}
export function unknownFacilityActionAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: number,
) {
  const attempt = cache.getQueryData<FacilityActionAttempt | null>(key);
  if (attempt?.token === token)
    setFacilityActionAttempt(cache, key, { ...attempt, status: "unknown" });
}
export function useFacilityActionAttempt(
  clientId: string,
  actor: ProfileActor | undefined,
  facilityId: string,
) {
  const cache = useQueryClient();
  const key = useMemo(
    () => facilityActionAttemptKey(clientId, actor, facilityId),
    [clientId, actor, facilityId],
  );
  const encoded = JSON.stringify(key);
  const attempt = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          if (JSON.stringify(event.query.queryKey) === encoded) notify();
        }),
      ),
    () => cache.getQueryData<FacilityActionAttempt | null>(key) ?? null,
    () => null,
  );
  return { key, attempt };
}
