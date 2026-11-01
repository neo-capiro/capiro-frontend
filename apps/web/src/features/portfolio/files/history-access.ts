import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { signedUrl, type Attachment } from "./contracts";
import type { FileNavigation } from "./navigation";
import { currentFilesAvailable, currentFilesKey } from "./file-reader";
import type { FileExecution } from "./file-scope";
import {
  fileHistorySchema,
  historyPageSize,
  type FileHistoryRequest,
} from "./history-contract";

/** Current history and nullable original-version links from the canonical Core owner. */
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

/** A displayed URL is only a hint: obtain a new current-owner read before navigation. */
export async function currentFileHistoryDestination(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  request: FileHistoryRequest,
  selected: Pick<Attachment, "id" | "source">,
  kind: FileNavigation,
  execution: FileExecution,
  expectedContentHash?: string,
) {
  const result = await readFileHistory(
    api,
    cache,
    clientId,
    request,
    execution,
  );
  const item = result.versions.find(
    (version) =>
      version.attachmentId === selected.id &&
      version.source === selected.source,
  );
  if (!item)
    throw new ApiError(
      404,
      "This version is no longer in the selected history page.",
    );
  if (expectedContentHash !== undefined && item.contentHash !== expectedContentHash)
    throw new ApiError(409, "The cited file bytes changed. Review the current source again.");
  if (!item.usable)
    throw new ApiError(
      409,
      item.blockedReason ?? "This version cannot be opened.",
    );
  const url = signedUrl(
    kind === "download" ? item.downloadUrl : item.previewUrl,
  );
  if (!url)
    throw new ApiError(
      409,
      "A current link is not available for this version.",
    );
  const guard = () => {
    execution.guard();
    const files = cache.getQueryData<Attachment[]>(
      currentFilesKey(cache, clientId),
    );
    if (
      !currentFilesAvailable(cache, clientId) ||
      !files?.some((file) => file.id === request.attachmentId)
    )
      throw new ApiError(
        409,
        "Refresh the current client files before opening history.",
      );
  };
  guard();
  return { url, guard };
}
