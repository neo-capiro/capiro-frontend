"use client";
import { useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import type { Attachment } from "./contracts";
import { currentFilesAvailable, currentFilesKey } from "./file-reader";
import { useFileScope, type FileExecution } from "./file-scope";
import { filesOptions } from "./queries";

const textSchema = z.object({
  attachmentId: z.string().uuid(),
  text: z.string(),
  truncated: z.boolean().optional(),
  disclosure: z.string().optional(),
});
type ExtractedFileText = z.infer<typeof textSchema>;
/** Core's read-only endpoint never starts provider processing and is safe to recheck. */
export async function extractCurrentFile(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  selected: Pick<Attachment, "id" | "source">,
  execution: FileExecution,
) {
  const queryKey = currentFilesKey(cache, clientId);
  const revision = cache.getQueryState(queryKey)?.dataUpdateCount;
  const guard = (sameRevision = true) => {
    execution.guard();
    const file = cache
      .getQueryData<Attachment[]>(queryKey)
      ?.find(
        (item) => item.id === selected.id && item.source === selected.source,
      );
    if (
      !currentFilesAvailable(cache, clientId) ||
      !file?.usable ||
      (sameRevision &&
        cache.getQueryState(queryKey)?.dataUpdateCount !== revision)
    )
      throw new ApiError(
        409,
        "The selected file changed or is unavailable. Refresh the files before reading text.",
      );
  };
  guard();
  const result = await api.request(
    "core",
    `engagement/attachments/${selected.id}/extract-text`,
    textSchema.refine((receipt) => receipt.attachmentId === selected.id),
    { signal: execution.signal },
  );
  guard();
  await cache.fetchQuery({
    ...filesOptions(api, cache, clientId),
    staleTime: 0,
  });
  guard(false);
  return result;
}

/** One selected preview owns the text receipt; obsolete completion has no cache or UI effect. */
export function useExtractFile(
  clientId: string,
  file: Pick<Attachment, "id" | "source">,
) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useFileScope(clientId, `extract:${file.id}:${file.source}`);
  const operation = useRef<FileExecution | null>(null);
  const [state, setState] = useState<{
    scope: string;
    pending?: boolean;
    data?: ExtractedFileText;
    error?: Error;
  }>();
  const visible = state?.scope === scope.key ? state : undefined;
  async function read() {
    if (operation.current && !operation.current.signal.aborted) return;
    let execution: FileExecution | undefined;
    try {
      execution = scope.capture();
      operation.current = execution;
      setState({ scope: scope.key, pending: true });
      const data = await extractCurrentFile(
        api,
        cache,
        clientId,
        file,
        execution,
      );
      execution.guard();
      setState({ scope: scope.key, data });
    } catch (error) {
      if (!execution?.signal.aborted)
        setState({
          scope: scope.key,
          error:
            error instanceof Error
              ? error
              : new Error("The text could not be read."),
        });
    } finally {
      if (operation.current === execution) operation.current = null;
    }
  }
  return {
    mutate: () => void read(),
    data: visible?.data,
    error: visible?.error,
    isPending: Boolean(visible?.pending),
    isSuccess: Boolean(visible?.data),
    canReadText: scope.canRead,
  };
}
