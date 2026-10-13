"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { filesKey, useFileReader } from "./file-reader";
import { useFileScope, type FileExecution } from "./file-scope";
import {
  deleteClientFile,
  fileDeletionKey,
  reviewFileDeletion,
  type FileDeletionAttempt,
} from "./deletion";

type DeletionState = {
  scope: string;
  pending?: boolean;
  error?: Error;
  current?: Awaited<ReturnType<typeof reviewFileDeletion>>;
};

export function useFileDeletion(
  clientId: string,
  id: string,
  onDeleted: () => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  const reader = useFileReader();
  const scope = useFileScope(clientId, `delete:${id}`);
  const { data: attempt } = useQuery<FileDeletionAttempt | null>({
    queryKey: fileDeletionKey(clientId, id, reader),
    queryFn: () => null,
    enabled: false,
    gcTime: Infinity,
  });
  const operation = useRef<FileExecution | null>(null);
  const [state, setState] = useState<DeletionState>();
  const visible = state?.scope === scope.key ? state : undefined;
  async function run(review: boolean) {
    if (operation.current && !operation.current.signal.aborted) return;
    let execution: FileExecution | undefined;
    try {
      execution = scope.capture(!review);
      operation.current = execution;
      setState({ scope: scope.key, pending: true });
      const context = { cache, clientId, execution };
      if (review) {
        const current = await reviewFileDeletion(api, id, context);
        setState({ scope: scope.key, current });
        return;
      }
      await deleteClientFile(api, id, context);
      await cache.invalidateQueries({ queryKey: filesKey(clientId) });
      execution.guard();
      setState({ scope: scope.key });
      onDeleted();
    } catch (error) {
      if (!execution?.signal.aborted)
        setState({
          scope: scope.key,
          error:
            error instanceof Error
              ? error
              : new Error("The deletion could not be confirmed."),
        });
    } finally {
      if (operation.current === execution) operation.current = null;
    }
  }
  return {
    attempt,
    error: visible?.error,
    current: visible?.current,
    isPending: Boolean(visible?.pending) || attempt?.status === "pending",
    blocked: !scope.canWrite || Boolean(visible?.pending) || Boolean(attempt),
    canReview:
      scope.canRead && !visible?.pending && attempt?.status === "unknown",
    remove: () => void run(false),
    review: () => void run(true),
  };
}
