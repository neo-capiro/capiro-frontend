import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { ambiguousClientWrite } from "@/shared/portfolio/auth/client-writer";
import {
  fileAccessForIdSchema,
  fileChangeForIdSchema,
  type Attachment,
  type FileMetadataChange,
} from "./contracts";
import { currentFilesKey } from "./file-reader";
import type { FileExecution } from "./file-scope";
import {
  fileMetadataAttemptKey,
  nextFileMetadataAttempt,
  setFileMetadataAttempt,
  settleFileMetadataAttempt,
  type FileMetadataAttempt,
} from "./metadata-attempt";

function currentFile(
  cache: QueryClient,
  clientId: string,
  id: string,
  execution: FileExecution,
) {
  execution.guard();
  if (
    !cache
      .getQueryData<Attachment[]>(currentFilesKey(cache, clientId))
      ?.some((file) => file.id === id)
  )
    throw new ApiError(
      409,
      "Refresh the client files before changing this file.",
    );
}

export async function saveFileMetadata(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  id: string,
  change: FileMetadataChange,
  execution: FileExecution,
) {
  currentFile(cache, clientId, id, execution);
  const key = fileMetadataAttemptKey(clientId, id, execution.actor);
  if (cache.getQueryData<FileMetadataAttempt | null>(key))
    throw new ApiError(409, "Review the current file before saving again.");
  const token = nextFileMetadataAttempt();
  setFileMetadataAttempt(cache, key, { token, status: "pending", change });
  let received = false;
  try {
    const result = await api.request(
      "core",
      `clients/${clientId}/files/${id}/${change.kind === "move" ? "folder" : "access"}`,
      fileChangeForIdSchema(id, change),
      {
        method: "PATCH",
        signal: execution.signal,
        body:
          change.kind === "move"
            ? { folder: change.folder }
            : {
                viewerMode: change.viewerMode,
                viewerUserIds: change.viewerUserIds,
              },
      },
    );
    received = true;
    currentFile(cache, clientId, id, execution);
    settleFileMetadataAttempt(cache, key, token, false);
    return result;
  } catch (error) {
    settleFileMetadataAttempt(
      cache,
      key,
      token,
      received || execution.signal.aborted || ambiguousClientWrite(error),
    );
    throw error;
  }
}

// A GET establishes current state only; it cannot prove which PATCH produced it.
export async function reviewFileMetadata(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  id: string,
  execution: FileExecution,
) {
  currentFile(cache, clientId, id, execution);
  const key = fileMetadataAttemptKey(clientId, id, execution.actor);
  const attempt = cache.getQueryData<FileMetadataAttempt | null>(key);
  if (attempt?.status !== "unknown")
    throw new ApiError(
      409,
      "Wait for the file save to finish before reviewing it.",
    );
  const current = await api.request(
    "core",
    `clients/${clientId}/files/${id}/access`,
    fileAccessForIdSchema(id),
    { signal: execution.signal },
  );
  currentFile(cache, clientId, id, execution);
  settleFileMetadataAttempt(cache, key, attempt.token, false);
  return current;
}
