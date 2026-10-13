"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import type { FileMetadataChange } from "./contracts";
import { useFileReader } from "./file-reader";

// Cache-local replay protection, not a durable native operation receipt.
export type FileMetadataAttempt = {
  token: number;
  status: "pending" | "unknown";
  change: FileMetadataChange;
};
let sequence = 0;
export const nextFileMetadataAttempt = () => ++sequence;
export const fileMetadataAttemptKey = (
  clientId: string,
  id: string,
  actor?: ClientWriter,
) =>
  [
    "file-metadata-attempt",
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    clientId,
    id,
  ] as const;
export function setFileMetadataAttempt(
  cache: QueryClient,
  key: QueryKey,
  attempt: FileMetadataAttempt | null,
) {
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
}
export function settleFileMetadataAttempt(
  cache: QueryClient,
  key: QueryKey,
  token: number,
  unknown: boolean,
) {
  const attempt = cache.getQueryData<FileMetadataAttempt | null>(key);
  if (attempt?.token === token)
    setFileMetadataAttempt(
      cache,
      key,
      unknown ? { ...attempt, status: "unknown" } : null,
    );
}
export function useFileMetadataAttempt(clientId: string, id: string) {
  const cache = useQueryClient();
  const reader = useFileReader();
  const tenantId = reader?.tenantId;
  const userId = reader?.userId;
  const key = useMemo(
    () =>
      fileMetadataAttemptKey(
        clientId,
        id,
        tenantId && userId ? { tenantId, userId } : undefined,
      ),
    [clientId, id, tenantId, userId],
  );
  const encoded = JSON.stringify(key);
  const attempt = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (JSON.stringify(event.query.queryKey) === encoded) notify();
      }),
    () => cache.getQueryData<FileMetadataAttempt | null>(key) ?? null,
    () => null,
  );
  return { key, attempt };
}
