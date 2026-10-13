"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { filesKey, useFileReader } from "./file-reader";
import { useFileScope, type FileExecution } from "./file-scope";
import { normalizedFolder, type FolderAccessChange } from "./contracts";
import {
  folderAccessKey,
  reviewFolderAccess,
  saveFolderAccess,
  type FolderAccessAttempt,
} from "./folder-access";
export type { FolderAccessChange as FileChange } from "./contracts";

type FolderState = {
  scope: string;
  pending?: boolean;
  error?: Error;
  draft?: FolderAccessChange;
  current?: Awaited<ReturnType<typeof reviewFolderAccess>>;
};

export function useFileChange(
  clientId: string,
  folder: string | null,
  onSaved?: () => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  const reader = useFileReader();
  const scope = useFileScope(
    clientId,
    `folder-access:${JSON.stringify(normalizedFolder(folder))}`,
  );
  const { data: attempt } = useQuery<FolderAccessAttempt | null>({
    queryKey: folderAccessKey(clientId, folder, reader),
    queryFn: () => null,
    enabled: false,
    gcTime: Infinity,
  });
  const operation = useRef<FileExecution | null>(null);
  const [state, setState] = useState<FolderState>();
  const visible = state?.scope === scope.key ? state : undefined;
  async function run(change?: FolderAccessChange) {
    if (operation.current && !operation.current.signal.aborted) return;
    let execution: FileExecution | undefined;
    try {
      execution = scope.capture(Boolean(change));
      operation.current = execution;
      const draft = change ?? attempt?.change;
      setState({ scope: scope.key, pending: true, draft });
      const context = { cache, clientId, execution };
      if (!change) {
        const current = await reviewFolderAccess(api, folder, context);
        execution.guard();
        setState({ scope: scope.key, current, draft });
        return;
      }
      await saveFolderAccess(api, change, context);
      execution.guard();
      await Promise.all([
        cache.invalidateQueries({ queryKey: filesKey(clientId) }),
        cache.invalidateQueries({ queryKey: ["file-access", clientId] }),
      ]);
      execution.guard();
      setState({ scope: scope.key });
      onSaved?.();
    } catch (error) {
      if (!execution?.signal.aborted)
        setState({
          scope: scope.key,
          draft: change ?? attempt?.change,
          error:
            error instanceof Error
              ? error
              : new Error("The folder access change could not be confirmed."),
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
    mutate: (change: FolderAccessChange) => void run(change),
    review: () => void run(),
  };
}
export { useExtractFile } from "./extraction";
