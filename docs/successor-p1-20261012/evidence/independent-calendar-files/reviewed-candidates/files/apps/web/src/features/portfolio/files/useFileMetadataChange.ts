"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import type { FileMetadataChange } from "./contracts";
import { useFileScope, type FileExecution } from "./file-scope";
import { filesKey } from "./file-reader";
import { useFileMetadataAttempt } from "./metadata-attempt";
import { reviewFileMetadata, saveFileMetadata } from "./metadata-actions";

type MetadataState = {
  scope: string;
  pending?: boolean;
  error?: Error;
  current?: Awaited<ReturnType<typeof reviewFileMetadata>>;
  draft?: FileMetadataChange;
};
export function useFileMetadataChange(
  clientId: string,
  id: string,
  onSaved: () => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useFileScope(clientId, `metadata:${id}`);
  const { attempt } = useFileMetadataAttempt(clientId, id);
  const operation = useRef<FileExecution | null>(null);
  const [state, setState] = useState<MetadataState>();
  const visible = state?.scope === scope.key ? state : undefined;
  async function run(change?: FileMetadataChange) {
    if (operation.current && !operation.current.signal.aborted) return;
    let execution: FileExecution | undefined;
    try {
      execution = scope.capture(Boolean(change));
      operation.current = execution;
      const draft = change ?? attempt?.change;
      setState({ scope: scope.key, pending: true, draft });
      if (!change) {
        const current = await reviewFileMetadata(
          api,
          cache,
          clientId,
          id,
          execution,
        );
        setState({ scope: scope.key, current, draft });
        return;
      }
      await saveFileMetadata(api, cache, clientId, id, change, execution);
      await Promise.all([
        cache.invalidateQueries({ queryKey: filesKey(clientId) }),
        cache.invalidateQueries({ queryKey: ["file-access", clientId, id] }),
      ]);
      execution.guard();
      setState({ scope: scope.key });
      onSaved();
    } catch (error) {
      if (!execution?.signal.aborted)
        setState({
          scope: scope.key,
          draft: change ?? attempt?.change,
          error:
            error instanceof Error
              ? error
              : new Error("The file change could not be confirmed."),
        });
    } finally {
      if (operation.current === execution) operation.current = null;
    }
  }
  return {
    attempt,
    draft: visible?.draft ?? attempt?.change,
    error: visible?.error,
    current: visible?.current,
    isPending: Boolean(visible?.pending) || attempt?.status === "pending",
    blocked: !scope.canWrite || Boolean(visible?.pending) || Boolean(attempt),
    canReview:
      scope.canRead && !visible?.pending && attempt?.status === "unknown",
    mutate: (change: FileMetadataChange) => void run(change),
    review: () => void run(),
  };
}
