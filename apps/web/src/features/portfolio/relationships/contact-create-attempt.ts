import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { ApiError } from "@/shared/portfolio/api/http";
import type { PersonChange } from "./contact-api";

type CreateAttempt = {
  token: string;
  status: "pending" | "unknown";
  change: Extract<PersonChange, { kind: "save" }>;
};
export const contactCreateAttemptKey = (
  tenantId: string,
  userId: string,
  clientId: string,
) => ["contact-create-attempt", tenantId, userId, clientId, "new"] as const;

export function useContactCreateAttempt(clientId: string) {
  const identity = useIdentity();
  const cache = useQueryClient();
  const key = contactCreateAttemptKey(
    identity.data?.tenant?.id ?? "",
    identity.data?.user.id ?? "",
    clientId,
  );
  const encoded = JSON.stringify(key);
  const attempt = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (JSON.stringify(event.query.queryKey) === encoded) notify();
      }),
    () => cache.getQueryData<CreateAttempt | null>(key) ?? null,
    () => null,
  );
  return { key, attempt };
}

export function beginContactCreate(
  cache: QueryClient,
  key: QueryKey,
  change: CreateAttempt["change"],
) {
  if (cache.getQueryData<CreateAttempt | null>(key))
    throw new ApiError(
      409,
      "A contact creation is pending or may have completed. Review the roster before starting another contact; this attempt cannot be repeated here.",
    );
  const attempt: CreateAttempt = {
    token: crypto.randomUUID(),
    status: "pending",
    change: structuredClone(change),
  };
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
  return attempt.token;
}

export function settleContactCreate(
  cache: QueryClient,
  key: QueryKey,
  token: string,
  error?: unknown,
) {
  const attempt = cache.getQueryData<CreateAttempt | null>(key);
  if (attempt?.token !== token) return;
  const uncertain =
    error !== undefined &&
    (!(error instanceof ApiError) || error.status >= 500);
  const next: CreateAttempt | null = uncertain
    ? { ...attempt, status: "unknown" }
    : null;
  cache.setQueryData<CreateAttempt | null>(key, next);
}
