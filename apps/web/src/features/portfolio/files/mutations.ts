"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { assertFileReader, filesKey, useFileReader } from "./file-reader";
import { useFileScope, type FileExecution } from "./file-scope";
import {
  fileAccessKey,
  type FileAccessAttempt,
  type FileAccessCommand,
} from "./file-access-command";
import { fileAccessRecovery } from "./file-access-recovery";
import { saveFileAccess, type FileAccessInput } from "./folder-access";
function useAccessJournal(clientId: string) {
  const cache = useQueryClient(),
    reader = useFileReader();
  return useQuery<FileAccessAttempt | null>({
    queryKey: fileAccessKey(clientId, reader),
    enabled: Boolean(reader),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    queryFn: () => {
      if (!reader)
        throw new Error(
          "Verify the current account before recovering access changes.",
        );
      return fileAccessRecovery(clientId, reader, () =>
        assertFileReader(cache, reader),
      ).load();
    },
  });
}
export function useFileAccessAttempt(clientId: string) {
  return useAccessJournal(clientId).data ?? null;
}
export function useFileChange(clientId: string, onSaved: () => void) {
  const api = useApi(),
    cache = useQueryClient(),
    scope = useFileScope(clientId, "file-access", false);
  const journal = useAccessJournal(clientId),
    attempt = journal.data ?? null;
  const operation = useRef<FileExecution | null>(null);
  const [state, setState] = useState<{
    scope: string;
    pending?: boolean;
    error?: Error;
  }>();
  const visible = state?.scope === scope.key ? state : undefined;
  async function run(input: FileAccessInput) {
    if (operation.current && !operation.current.signal.aborted) return;
    let execution: FileExecution | undefined;
    try {
      execution = scope.capture("command" in input);
      operation.current = execution;
      setState({ scope: scope.key, pending: true });
      const outcome = await saveFileAccess(
        api,
        cache,
        clientId,
        execution,
        input,
      );
      execution.guard();
      setState({ scope: scope.key });
      if (
        outcome.status === "completed" ||
        ("recover" in input && input.recover === "retire")
      ) {
        await cache.invalidateQueries({ queryKey: filesKey(clientId) });
        execution.guard();
        onSaved();
      }
    } catch (error) {
      if (!execution?.signal.aborted)
        setState({
          scope: scope.key,
          error:
            error instanceof Error
              ? error
              : new Error("The access change could not be confirmed."),
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
  const ready = scope.canRead && !pending && !journal.error;
  return {
    attempt,
    pending,
    error: visible?.error ?? journal.error,
    canStart: scope.canWrite && ready && !attempt,
    canCheck: ready && attempt?.status === "unknown",
    start: (command: FileAccessCommand) => void run({ command }),
    check: () => void run({ recover: "receipt" }),
    retry: () => void run({ recover: "retry" }),
    retire: () => void run({ recover: "retire" }),
  };
}
export { useExtractFile } from "./extraction";
