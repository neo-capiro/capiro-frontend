"use client";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  clientFilesSchema,
  fileAccessForIdSchema,
  storageUsageSchema,
} from "./contracts";
import {
  assertFileReader,
  currentFileReader,
  filesKey,
  readerFilesKey,
  useFileReader,
  type FileReader,
} from "./file-reader";
export { filesKey } from "./file-reader";
export const storageUsageKey = (clientId: string, reader?: FileReader) =>
  [
    ...filesKey(clientId),
    "storage-usage",
    reader?.tenantId ?? null,
    reader?.userId ?? null,
    reader?.revision ?? null,
  ] as const;
export function useStorageUsage(clientId: string) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  const reader = useFileReader();
  const query = useQuery({
    queryKey: storageUsageKey(clientId, reader),
    enabled: Boolean(reader),
    retry: false,
    queryFn: async ({ signal }) => {
      assertFileReader(cache, reader);
      const usage = await api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}/files/storage-usage`,
        storageUsageSchema(clientId),
        { signal },
      );
      assertFileReader(cache, reader);
      return usage;
    },
  });
  const waiting = identity.isPending || identity.isFetching;
  return {
    ...query,
    isPending: waiting || (Boolean(reader) && query.isPending),
    error:
      query.error ??
      (!reader && !waiting
        ? (identity.error ??
          new ApiError(
            403,
            "A current session is required to load client storage usage.",
          ))
        : null),
  };
}
export function filesOptions(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  reader: FileReader | undefined = currentFileReader(cache),
) {
  return {
    queryKey: readerFilesKey(clientId, reader),
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      assertFileReader(cache, reader);
      const files = await api.request(
        "core",
        `engagement/attachments?${new URLSearchParams({ clientId })}`,
        clientFilesSchema(clientId),
        { signal },
      );
      assertFileReader(cache, reader);
      return files;
    },
  };
}
export function useFiles(clientId: string) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  const reader = useFileReader();
  const query = useQuery({
    ...filesOptions(api, cache, clientId, reader),
    enabled: Boolean(reader),
    refetchInterval: (query) =>
      query.state.data?.some(
        (f) =>
          f.lifecycleStatus === "quarantined" ||
          f.extractionStatus === "pending",
      )
        ? 10000
        : false,
  });
  const waiting = identity.isPending || identity.isFetching;
  return {
    ...query,
    readerScope: JSON.stringify(readerFilesKey(clientId, reader)),
    isPending: waiting || (Boolean(reader) && query.isPending),
    error:
      query.error ??
      (!reader && !waiting
        ? (identity.error ??
          new ApiError(
            403,
            "A current session is required to load client files.",
          ))
        : null),
  };
}
export function useFileAccess(clientId: string, id?: string) {
  const api = useApi();
  const cache = useQueryClient();
  const reader = useFileReader();
  return useQuery({
    queryKey: [
      "file-access",
      clientId,
      id,
      reader?.tenantId,
      reader?.userId,
      reader?.revision,
    ],
    enabled: Boolean(id && reader),
    queryFn: async ({ signal }) => {
      assertFileReader(cache, reader);
      const access = await api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}/files/${encodeURIComponent(id ?? "")}/access`,
        fileAccessForIdSchema(id ?? ""),
        { signal },
      );
      assertFileReader(cache, reader);
      return access;
    },
  });
}
