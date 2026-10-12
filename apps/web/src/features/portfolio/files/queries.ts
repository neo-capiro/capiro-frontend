"use client";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { clientFilesSchema, fileAccessForIdSchema } from "./contracts";
import {
  assertFileReader,
  currentFileReader,
  readerFilesKey,
  useFileReader,
  type FileReader,
} from "./file-reader";
export { filesKey } from "./file-reader";
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
  return useQuery({
    queryKey: ["file-access", clientId, id],
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `clients/${encodeURIComponent(clientId)}/files/${encodeURIComponent(id ?? "")}/access`,
        fileAccessForIdSchema(id ?? ""),
        { signal },
      ),
  });
}
