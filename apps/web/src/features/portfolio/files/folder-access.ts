import { isCancelledError, type QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  ambiguousClientWrite,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import {
  folderAccessForChangeSchema,
  normalizeFolderAccess,
  normalizedFolder,
  type FolderAccessChange,
} from "./contracts";
import { currentFilesAvailable } from "./file-reader";
import type { FileExecution } from "./file-scope";
import { filesOptions } from "./queries";

export type FolderAccessContext = {
  cache: QueryClient;
  clientId: string;
  execution: FileExecution;
};
export type FolderAccessAttempt = {
  token: number;
  status: "pending" | "unknown";
  change: FolderAccessChange;
};
export const folderAccessKey = (
  clientId: string,
  folder: string | null,
  actor?: ClientWriter,
) =>
  [
    "folder-access-attempt",
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    clientId,
    normalizedFolder(folder),
  ] as const;
let sequence = 0;

// A cache-local attempt identity cannot authorize a native write or prove its outcome.
function journalEntry(context: FolderAccessContext, folder: string | null) {
  const { cache, clientId, execution } = context;
  const key = folderAccessKey(clientId, folder, execution.actor);
  const query = cache.getQueryCache().find({ queryKey: key, exact: true });
  const current = () =>
    cache.getQueryCache().find({ queryKey: key, exact: true }) === query
      ? cache.getQueryData<FolderAccessAttempt | null>(key)
      : undefined;
  return {
    current,
    settle(token: number, unknown: boolean) {
      const attempt = current();
      if (query && attempt?.token === token)
        cache.setQueryData(
          key,
          unknown ? { ...attempt, status: "unknown" } : null,
        );
    },
  };
}

export async function saveFolderAccess(
  api: ApiClient,
  change: FolderAccessChange,
  context: FolderAccessContext,
) {
  const { cache, clientId, execution } = context;
  execution.guard();
  if (!currentFilesAvailable(cache, clientId))
    throw new ApiError(
      409,
      "Refresh the current client files before changing folder access.",
    );
  const intent = normalizeFolderAccess(change);
  const key = folderAccessKey(clientId, intent.folder, execution.actor);
  if (cache.getQueryData<FolderAccessAttempt | null>(key))
    throw new ApiError(
      409,
      "Review the current folder files before saving again.",
    );
  const token = ++sequence;
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData<FolderAccessAttempt>(key, {
    token,
    status: "pending",
    change: intent,
  });
  const journal = journalEntry(context, intent.folder);
  const interrupted = () => journal.settle(token, true);
  execution.signal.addEventListener("abort", interrupted, { once: true });
  let dispatched = false;
  let received = false;
  try {
    execution.guard();
    if (journal.current()?.token !== token)
      throw new ApiError(
        409,
        "This folder access attempt is no longer current.",
      );
    dispatched = true;
    const result = await api.request(
      "core",
      `clients/${encodeURIComponent(clientId)}/files/access/folder`,
      folderAccessForChangeSchema(intent),
      {
        method: "PATCH",
        signal: execution.signal,
        body: {
          folder: intent.folder,
          viewerMode: intent.viewerMode,
          viewerUserIds: intent.viewerUserIds,
        },
      },
    );
    received = true;
    execution.guard();
    if (
      journal.current()?.token !== token ||
      journal.current()?.status !== "pending"
    )
      throw new ApiError(
        409,
        "This folder access attempt is no longer current.",
      );
    journal.settle(token, false);
    return result;
  } catch (error) {
    journal.settle(
      token,
      dispatched &&
        (received || execution.signal.aborted || ambiguousClientWrite(error)),
    );
    throw error;
  } finally {
    execution.signal.removeEventListener("abort", interrupted);
  }
}

// An explicit GET reviews current visible state, never the causality of a previous PATCH.
export async function reviewFolderAccess(
  api: ApiClient,
  folder: string | null,
  context: FolderAccessContext,
) {
  const { cache, clientId, execution } = context;
  execution.guard();
  const journal = journalEntry(context, folder);
  const attempt = journal.current();
  if (attempt?.status !== "unknown" || !currentFilesAvailable(cache, clientId))
    throw new ApiError(
      409,
      "Wait for current files before reviewing folder access.",
    );
  const options = filesOptions(api, cache, clientId);
  const queryKey = options.queryKey;
  await cache.cancelQueries({ queryKey, exact: true });
  execution.guard();
  const before = cache.getQueryState(queryKey)?.dataUpdateCount ?? 0;
  const cancel = () => {
    void cache.cancelQueries({ queryKey, exact: true });
  };
  execution.signal.addEventListener("abort", cancel, { once: true });
  try {
    let originalRead: AbortSignal | undefined;
    const files = await cache.fetchQuery({
      ...options,
      staleTime: 0,
      queryFn: (request) => {
        originalRead ??= request.signal;
        return options.queryFn(request);
      },
    });
    execution.guard();
    if (
      !originalRead ||
      originalRead.aborted ||
      !currentFilesAvailable(cache, clientId) ||
      cache.getQueryState(queryKey)?.dataUpdateCount !== before + 1 ||
      journal.current()?.token !== attempt.token ||
      journal.current()?.status !== "unknown"
    )
      throw new ApiError(
        409,
        "The current folder files changed during review. Review again.",
      );
    journal.settle(attempt.token, false);
    return files.filter((file) => file.folder === normalizedFolder(folder));
  } catch (error) {
    if (isCancelledError(error))
      throw new ApiError(
        409,
        "The current folder files changed during review. Review again.",
      );
    throw error;
  } finally {
    execution.signal.removeEventListener("abort", cancel);
  }
}
