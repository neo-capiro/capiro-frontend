"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import type { ActivityChange } from "./activity-change";

// Session-cache protection only; this is not a native operation receipt.
export type ActivityAttempt = {
  token: number;
  status: "pending" | "unknown";
  change: ActivityChange;
};
let sequence = 0;
export const activityAttemptKey = (
  clientId: string,
  id: string,
  actor?: ClientWriter,
) =>
  [
    "activity-attempt",
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    clientId,
    id,
  ] as const;

export const currentActivityAttempt = (cache: QueryClient, key: QueryKey) =>
  cache.getQueryData<ActivityAttempt | null>(key) ?? null;

export function beginActivityAttempt(
  cache: QueryClient,
  key: QueryKey,
  change: ActivityChange,
) {
  if (currentActivityAttempt(cache, key))
    throw new ApiError(
      409,
      "Review the latest activity before changing it again.",
    );
  const attempt: ActivityAttempt = {
    token: ++sequence,
    status: "pending",
    change:
      change.action === "edit"
        ? { ...change, fields: { ...change.fields } }
        : { ...change },
  };
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
  return attempt;
}

export function settleActivityAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: number,
  unknown: boolean,
) {
  const current = currentActivityAttempt(cache, key);
  if (current?.token !== token) return;
  const next: ActivityAttempt | null = unknown
    ? { ...current, status: "unknown" }
    : null;
  cache.setQueryData<ActivityAttempt | null>(key, next);
}

export function assertActivityReviewAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: number | undefined,
) {
  const current = currentActivityAttempt(cache, key);
  if (current?.token !== token || current?.status === "pending")
    throw new ApiError(409, "The activity attempt changed. Review it again.");
}

export function useActivityAttempt(
  clientId: string,
  id: string,
  actor?: ClientWriter,
) {
  const cache = useQueryClient();
  const tenantId = actor?.tenantId;
  const userId = actor?.userId;
  const key = useMemo(
    () =>
      activityAttemptKey(
        clientId,
        id,
        tenantId && userId ? { tenantId, userId } : undefined,
      ),
    [clientId, id, tenantId, userId],
  );
  const scope = JSON.stringify(key);
  const attempt = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (JSON.stringify(event.query.queryKey) === scope) notify();
      }),
    () => currentActivityAttempt(cache, key),
    () => null,
  );
  return { key, scope, attempt };
}
