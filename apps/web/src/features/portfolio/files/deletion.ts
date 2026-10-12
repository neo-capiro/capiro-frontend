import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  ambiguousClientWrite,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import type { FileExecution } from "./file-scope";
import type { Attachment } from "./contracts";
import { currentFilesAvailable, currentFilesKey } from "./file-reader";
import { filesOptions } from "./queries";

export type FileDeletionContext = {
  cache: QueryClient;
  clientId: string;
  execution: FileExecution;
};

export type FileDeletionAttempt = {
  token: number;
  status: "pending" | "unknown";
};
export const fileDeletionKey = (
  clientId: string,
  id: string,
  actor?: ClientWriter,
) =>
  [
    "file-deletion",
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    clientId,
    id,
  ] as const;
let sequence = 0;

function settle(
  context: FileDeletionContext,
  id: string,
  token: number,
  unknown: boolean,
) {
  const key = fileDeletionKey(context.clientId, id, context.execution.actor);
  const attempt = context.cache.getQueryData<FileDeletionAttempt | null>(key);
  if (attempt?.token === token)
    context.cache.setQueryData(
      key,
      unknown ? { ...attempt, status: "unknown" } : null,
    );
}

// This is cache-local repeat-dispatch protection, not a durable operation receipt.
export async function deleteClientFile(
  api: ApiClient,
  id: string,
  context: FileDeletionContext,
) {
  const { cache, clientId, execution } = context;
  execution.guard();
  const key = fileDeletionKey(clientId, id, execution.actor);
  if (cache.getQueryData<FileDeletionAttempt | null>(key))
    throw new ApiError(
      409,
      "Review the current files before confirming deletion again.",
    );
  const file = cache
    .getQueryData<Attachment[]>(currentFilesKey(cache, clientId))
    ?.find((row) => row.id === id);
  if (!currentFilesAvailable(cache, clientId) || !file)
    throw new ApiError(
      409,
      "Refresh the current client files before deleting.",
    );
  if (file.lifecycleStatus === "delete_pending")
    throw new ApiError(
      409,
      "Deletion is already pending. Refresh the current client files.",
    );
  const token = ++sequence;
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData<FileDeletionAttempt>(key, { token, status: "pending" });
  let received = false;
  try {
    const result = await api.request(
      "core",
      `engagement/attachments/${encodeURIComponent(id)}`,
      z.object({ ok: z.literal(true) }),
      {
        method: "DELETE",
        signal: execution.signal,
      },
    );
    received = true;
    execution.guard();
    settle(context, id, token, false);
    return result;
  } catch (error) {
    settle(
      context,
      id,
      token,
      received || execution.signal.aborted || ambiguousClientWrite(error),
    );
    throw error;
  }
}

// The native list is visibility-filtered: absence never proves object deletion.
export async function reviewFileDeletion(
  api: ApiClient,
  id: string,
  context: FileDeletionContext,
) {
  const { cache, clientId, execution } = context;
  execution.guard();
  const attempt = cache.getQueryData<FileDeletionAttempt | null>(
    fileDeletionKey(clientId, id, execution.actor),
  );
  if (attempt?.status !== "unknown" || !currentFilesAvailable(cache, clientId))
    throw new ApiError(
      409,
      "Wait for the current file operation to finish before reviewing.",
    );
  const options = filesOptions(api, cache, clientId);
  const before = cache.getQueryState(options.queryKey);
  // Invoke the actual GET, never accept a cached/background query as deliberate review.
  const files = await options.queryFn({ signal: execution.signal });
  execution.guard();
  if (
    !currentFilesAvailable(cache, clientId) ||
    cache.getQueryState(options.queryKey)?.dataUpdateCount !==
      before?.dataUpdateCount
  )
    throw new ApiError(
      409,
      "The current files changed during review. Review again.",
    );
  const latest = cache.getQueryData<FileDeletionAttempt | null>(
    fileDeletionKey(clientId, id, execution.actor),
  );
  if (latest?.token !== attempt.token || latest.status !== "unknown")
    throw new ApiError(
      409,
      "The deletion attempt changed during review. Review again.",
    );
  cache.setQueryData(options.queryKey, files);
  const file = files.find((row) => row.id === id) ?? null;
  if (file && file.lifecycleStatus !== "delete_pending")
    settle(context, id, attempt.token, false);
  return { file };
}
