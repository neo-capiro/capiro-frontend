"use client";
import { useMemo, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { identitySchema, useIdentity } from "@/shared/portfolio/auth/identity";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";

export type FileReader = ClientWriter & { revision: number };

/** This prefix remains the public invalidation target for all attachment writers. */
export const filesKey = (clientId: string) =>
  ["client-files", clientId] as const;

/** Reader identity scopes cached data; the native list endpoint still decides ACL access. */
export function currentFileReader(cache: QueryClient): FileReader | undefined {
  const state = cache.getQueryState(["identity"]);
  const parsed = identitySchema.safeParse(state?.data);
  if (
    state?.status !== "success" ||
    state.error ||
    state.isInvalidated ||
    state.fetchStatus !== "idle" ||
    !parsed.success ||
    !parsed.data.user.id.trim() ||
    !parsed.data.tenant?.id.trim()
  )
    return;
  return {
    userId: parsed.data.user.id,
    tenantId: parsed.data.tenant.id,
    revision: state.dataUpdateCount,
  };
}

export const readerFilesKey = (clientId: string, reader?: FileReader) =>
  [
    ...filesKey(clientId),
    reader?.tenantId ?? null,
    reader?.userId ?? null,
    reader?.revision ?? null,
  ] as const;

export const currentFilesKey = (cache: QueryClient, clientId: string) =>
  readerFilesKey(clientId, currentFileReader(cache));

export function assertFileReader(cache: QueryClient, reader?: FileReader) {
  const current = currentFileReader(cache);
  if (
    !reader ||
    !current ||
    current.userId !== reader.userId ||
    current.tenantId !== reader.tenantId ||
    current.revision !== reader.revision
  )
    throw new ApiError(
      403,
      "Your current session cannot access this file view.",
    );
}

export function currentFilesAvailable(cache: QueryClient, clientId: string) {
  const reader = currentFileReader(cache);
  const state = cache.getQueryState(readerFilesKey(clientId, reader));
  return (
    Boolean(reader) &&
    state?.status === "success" &&
    !state.error &&
    !state.isInvalidated &&
    state.fetchStatus === "idle"
  );
}

export function useFileReader() {
  const cache = useQueryClient();
  useIdentity();
  const snapshot = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (event.type === "updated" && event.query.queryKey[0] === "identity")
          notify();
      }),
    () => {
      const state = cache.getQueryState(["identity"]);
      return JSON.stringify([
        state?.dataUpdateCount,
        state?.status,
        state?.fetchStatus,
        state?.isInvalidated,
        state?.errorUpdateCount,
      ]);
    },
    () => "",
  );
  return useMemo(
    () => (snapshot ? currentFileReader(cache) : undefined),
    [cache, snapshot],
  );
}
