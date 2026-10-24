"use client";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  batchMoveKey,
  moveFileBatch,
  type BatchMoveAttempt,
  type BatchMoveCommand,
} from "./batch-move";
import { filesKey, useFileReader } from "./file-reader";
import { useFileScope, type FileExecution } from "./file-scope";

export function useBatchMoveAttempt(clientId: string) {
  const cache = useQueryClient(),
    reader = useFileReader();
  const tenantId = reader?.tenantId,
    userId = reader?.userId;
  const key = useMemo(
    () =>
      batchMoveKey(
        clientId,
        tenantId && userId ? { tenantId, userId } : undefined,
      ),
    [clientId, tenantId, userId],
  );
  const encoded = JSON.stringify(key);
  return useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (JSON.stringify(event.query.queryKey) === encoded) notify();
      }),
    () => cache.getQueryData<BatchMoveAttempt | null>(key) ?? null,
    () => null,
  );
}
export function useBatchMove(clientId: string, onSaved: () => void) {
  const api = useApi(),
    cache = useQueryClient();
  const scope = useFileScope(clientId, "batch-move");
  const attempt = useBatchMoveAttempt(clientId);
  const operation = useRef<FileExecution | null>(null);
  const [state, setState] = useState<{
    scope: string;
    pending?: boolean;
    error?: Error;
  }>();
  const visible = state?.scope === scope.key ? state : undefined;
  async function run(
    input: { command: BatchMoveCommand } | { recover: "receipt" | "retry" },
  ) {
    if (operation.current && !operation.current.signal.aborted) return;
    let execution: FileExecution | undefined;
    try {
      execution = scope.capture(
        "command" in input || input.recover === "retry",
      );
      operation.current = execution;
      setState({ scope: scope.key, pending: true });
      await moveFileBatch(api, cache, clientId, execution, input);
      await cache.invalidateQueries({ queryKey: filesKey(clientId) });
      execution.guard();
      setState({ scope: scope.key });
      onSaved();
    } catch (error) {
      if (!execution?.signal.aborted)
        setState({
          scope: scope.key,
          error:
            error instanceof Error
              ? error
              : new Error("The move could not be confirmed."),
        });
    } finally {
      if (operation.current === execution) operation.current = null;
    }
  }
  const pending = Boolean(visible?.pending) || attempt?.status === "pending";
  return {
    attempt,
    pending,
    error: visible?.error,
    canStart: scope.canWrite && !pending && !attempt,
    canCheck: scope.canRead && !pending && attempt?.status === "unknown",
    canRetry: scope.canWrite && !pending && attempt?.status === "unknown",
    start: (command: BatchMoveCommand) => void run({ command }),
    check: () => void run({ recover: "receipt" }),
    retry: () => void run({ recover: "retry" }),
  };
}
