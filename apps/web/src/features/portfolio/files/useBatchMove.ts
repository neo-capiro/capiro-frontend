"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  batchMoveKey,
  moveFileBatch,
  type BatchMoveAttempt,
  type BatchMoveCommand,
  type BatchMoveInput,
} from "./batch-move";
import { assertFileReader, filesKey, useFileReader } from "./file-reader";
import { useFileScope, type FileExecution } from "./file-scope";
import { batchMoveRecovery } from "./batch-move-recovery";

function useBatchMoveJournal(clientId: string) {
  const cache = useQueryClient(),
    reader = useFileReader();
  return useQuery<BatchMoveAttempt | null>({
    queryKey: batchMoveKey(clientId, reader),
    enabled: Boolean(reader),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    queryFn: async () => {
      if (!reader)
        throw new Error(
          "Verify your current session before recovering file moves.",
        );
      return batchMoveRecovery(clientId, reader, () =>
        assertFileReader(cache, reader),
      ).load();
    },
  });
}
export function useBatchMoveAttempt(clientId: string) {
  return useBatchMoveJournal(clientId).data ?? null;
}
export function useBatchMove(clientId: string, onSaved: () => void) {
  const api = useApi(),
    cache = useQueryClient();
  const scope = useFileScope(clientId, "batch-move");
  const journal = useBatchMoveJournal(clientId);
  const attempt = journal.data ?? null;
  const operation = useRef<FileExecution | null>(null);
  const [state, setState] = useState<{
    scope: string;
    pending?: boolean;
    error?: Error;
  }>();
  const visible = state?.scope === scope.key ? state : undefined;
  async function run(input: BatchMoveInput) {
    if (operation.current && !operation.current.signal.aborted) return;
    let execution: FileExecution | undefined;
    try {
      execution = scope.capture(
        "command" in input || input.recover !== "receipt",
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
      if (operation.current === execution) {
        operation.current = null;
        setState((current) =>
          current?.scope === scope.key
            ? { ...current, pending: false }
            : current,
        );
      }
    }
  }
  const pending =
    journal.isPending ||
    Boolean(visible?.pending) ||
    attempt?.status === "pending";
  return {
    attempt,
    pending,
    error: visible?.error ?? journal.error ?? undefined,
    canStart: scope.canWrite && !pending && !journal.error && !attempt,
    canCheck:
      scope.canRead &&
      !pending &&
      attempt?.status === "unknown" &&
      !attempt.refusal,
    canRetry:
      scope.canWrite &&
      !pending &&
      attempt?.status === "unknown" &&
      !attempt.refusal,
    canRetire: scope.canWrite && !pending && Boolean(attempt?.refusal),
    start: (command: BatchMoveCommand) => void run({ command }),
    check: () => void run({ recover: "receipt" }),
    retry: () => void run({ recover: "retry" }),
    retire: () => void run({ recover: "retire-refusal" }),
  };
}
