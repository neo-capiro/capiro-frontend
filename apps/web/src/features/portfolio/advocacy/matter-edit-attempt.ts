"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  notifyManager,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { AdvocacyActor } from "./read-state";
import type { MatterUpdate } from "./matter-edit";

export type MatterEditAttempt = {
  token: number;
  input: MatterUpdate;
  acknowledged: boolean;
  status: "pending" | "unknown";
};
let sequence = 0;
export const nextMatterEditAttempt = () => ++sequence;
export const matterEditAttemptKey = (
  clientId: string,
  id: string,
  actor: AdvocacyActor,
) =>
  [
    "advocacy-edit-attempt",
    actor.tenantId,
    actor.userId,
    clientId,
    id,
  ] as const;
export function setMatterEditAttempt(
  cache: QueryClient,
  key: QueryKey,
  attempt: MatterEditAttempt | null,
) {
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
}
export function updateMatterEditAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: number,
  patch: Partial<Pick<MatterEditAttempt, "acknowledged" | "status">>,
) {
  const attempt = cache.getQueryData<MatterEditAttempt | null>(key);
  if (attempt?.token === token)
    setMatterEditAttempt(cache, key, { ...attempt, ...patch });
}
export function useMatterEditAttempt(
  clientId: string,
  id: string,
  actor: AdvocacyActor,
) {
  const cache = useQueryClient();
  const key = useMemo(
    () => matterEditAttemptKey(clientId, id, actor),
    [clientId, id, actor],
  );
  const encoded = JSON.stringify(key);
  const attempt = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe(
        notifyManager.batchCalls((event) => {
          if (JSON.stringify(event.query.queryKey) === encoded) notify();
        }),
      ),
    () => cache.getQueryData<MatterEditAttempt | null>(key) ?? null,
    () => null,
  );
  return { key, attempt };
}
