import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { Attachment } from "./contracts";
import { currentFilesAvailable, currentFilesKey } from "./file-reader";
import type { FileExecution } from "./file-scope";
import {
  fileHistorySchema,
  historyPageSize,
  type FileHistoryRequest,
} from "./history-contract";

/** A metadata-only current read through the canonical attachment route. */
export async function readFileHistory(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  request: FileHistoryRequest,
  execution: FileExecution,
) {
  const current = () => {
    execution.guard();
    const files = cache.getQueryData<Attachment[]>(
      currentFilesKey(cache, clientId),
    );
    if (
      !currentFilesAvailable(cache, clientId) ||
      !files?.some((item) => item.id === request.attachmentId)
    )
      throw new ApiError(
        409,
        "Refresh the current client files before reading history.",
      );
  };
  current();
  const query = new URLSearchParams({
    historyOf: request.attachmentId,
    historyPageSize: String(historyPageSize),
    ...(request.cursor === null ? {} : { historyCursor: request.cursor }),
  });
  const result = await api.request(
    "core",
    `engagement/attachments?${query}`,
    fileHistorySchema(request),
    { signal: execution.signal },
  );
  current();
  return result;
}
