"use client";
import { useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { useApi } from "@/shared/portfolio/api/provider";
import { signedUrl, type Attachment } from "./contracts";
import { useFileScope, type FileExecution } from "./file-scope";
import { currentFilesAvailable } from "./file-reader";
import { filesOptions } from "./queries";

export type FileNavigation = "download" | "preview";

/** Reuse the canonical list request; a cached signed URL never authorizes navigation. */
export async function currentFileDestination(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  selected: Pick<Attachment, "id" | "source">,
  kind: FileNavigation,
  execution: FileExecution,
) {
  execution.guard();
  if (!currentFilesAvailable(cache, clientId))
    throw new ApiError(
      409,
      "Refresh the client files before opening a document.",
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
    const files = await cache.fetchQuery({
      ...options,
      staleTime: 0,
    });
    execution.guard();
    const guard = () => {
      execution.guard();
      if (
        !currentFilesAvailable(cache, clientId) ||
        cache.getQueryState(queryKey)?.dataUpdateCount !== before + 1
      )
        throw new ApiError(
          409,
          "The file list changed. Check the current documents and try again.",
        );
    };
    // A successful unchanged GET may retain cache object identity through structural
    // sharing. Its update count still records the read, and detects later changes.
    guard();
    const current = files.find(
      (file) => file.id === selected.id && file.source === selected.source,
    );
    if (!current)
      throw new ApiError(
        404,
        "This document is no longer available in this view.",
      );
    if (!current.usable)
      throw new ApiError(
        409,
        current.blockedReason ?? "This file is not available to download yet.",
      );
    const url = signedUrl(
      kind === "download" ? current.downloadUrl : current.previewUrl,
    );
    if (!url)
      throw new ApiError(
        409,
        kind === "download"
          ? "A download link is not available for this file."
          : "An original preview is not available for this file.",
      );
    return { url, guard };
  } finally {
    execution.signal.removeEventListener("abort", cancel);
  }
}

/** Own the pending navigation and any blank preview window until the current read succeeds. */
export function useFileNavigation(
  clientId: string,
  context: string,
  readDestination: typeof currentFileDestination = currentFileDestination,
) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useFileScope(clientId, context);
  const operation = useRef<FileExecution | null>(null);
  const [state, setState] = useState<{
    scope: string;
    pending?: string;
    error?: Error;
  }>();
  const visible = state?.scope === scope.key ? state : undefined;
  async function navigate(
    file: Pick<Attachment, "id" | "source">,
    kind: FileNavigation,
  ) {
    if (operation.current && !operation.current.signal.aborted) return;
    let execution: FileExecution | undefined;
    let preview: Window | null = null;
    const closePreview = () => {
      preview?.close();
      preview = null;
    };
    try {
      execution = scope.capture();
      operation.current = execution;
      setState({ scope: scope.key, pending: file.id });
      if (kind === "preview") {
        // Reserve the new tab during the user's gesture, then remove its opener.
        preview = window.open("about:blank", "_blank");
        if (!preview)
          throw new Error(
            "Allow a new tab for this site, then try opening the file again.",
          );
        preview.opener = null;
        preview.document.title = "Checking current file access";
      }
      execution.signal.addEventListener("abort", closePreview, { once: true });
      const destination = await readDestination(
        api,
        cache,
        clientId,
        { id: file.id, source: file.source },
        kind,
        execution,
      );
      destination.guard();
      if (preview) {
        preview.location.replace(destination.url);
        preview = null;
      } else if (kind === "download") window.location.assign(destination.url);
      setState({ scope: scope.key });
    } catch (error) {
      if (!execution?.signal.aborted)
        setState({
          scope: scope.key,
          error:
            error instanceof Error
              ? error
              : new Error("The file could not be opened."),
        });
    } finally {
      execution?.signal.removeEventListener("abort", closePreview);
      closePreview();
      if (operation.current === execution) operation.current = null;
    }
  }
  return {
    navigate,
    pendingId: visible?.pending,
    error: visible?.error,
    canRead: scope.canRead,
    canWrite: scope.canWrite,
  };
}
