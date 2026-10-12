"use client";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  assertClientWriter,
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { useFiles } from "./queries";
import {
  assertFileReader,
  currentFileReader,
  currentFilesAvailable,
  currentFilesKey,
  readerFilesKey,
  useFileReader,
} from "./file-reader";

export type FileExecution = {
  actor: ClientWriter;
  signal: AbortSignal;
  guard: () => void;
};

/** One Files view lifetime; uploads retain its captured execution across retries. */
export function useFileScope(clientId: string, context: string) {
  const cache = useQueryClient();
  const reader = useFileReader();
  useFiles(clientId);
  useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (
          event.type === "updated" &&
          event.query.queryKey[0] === "client-files" &&
          event.query.queryKey[1] === clientId
        )
          notify();
      }),
    () => {
      const state = cache.getQueryState(currentFilesKey(cache, clientId));
      return JSON.stringify([
        state?.status,
        state?.fetchStatus,
        state?.isInvalidated,
        state?.errorUpdateCount,
      ]);
    },
    () => "",
  );
  const filesQueryKey = JSON.stringify(readerFilesKey(clientId, reader));
  const key = JSON.stringify([
    clientId,
    context,
    reader?.userId,
    reader?.tenantId,
    reader?.revision,
    cache.getQueryState(currentFilesKey(cache, clientId))?.errorUpdateCount,
  ]);
  const lifetime = useRef<{ key: string; controller: AbortController } | null>(
    null,
  );
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = { key, controller };
    const unsubscribe = cache.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      if (event.query.queryKey[0] === "identity") {
        try {
          assertFileReader(cache, reader);
        } catch {
          controller.abort();
        }
      }
      if (
        JSON.stringify(event.query.queryKey) === filesQueryKey &&
        event.query.state.status === "error"
      )
        controller.abort();
    });
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [cache, filesQueryKey, key, reader]);

  function capture(write = false): FileExecution {
    const held = lifetime.current;
    const actor = currentFileReader(cache);
    if (!held || held.key !== key || held.controller.signal.aborted || !actor)
      throw new ApiError(
        403,
        "Reopen this file view with a current session before continuing.",
      );
    const guard = () => {
      held.controller.signal.throwIfAborted();
      assertFileReader(cache, actor);
      if (write) {
        assertClientWriter(cache, actor);
        if (!currentFilesAvailable(cache, clientId))
          throw new ApiError(409, "Refresh the client files before uploading.");
      }
    };
    guard();
    return { actor, signal: held.controller.signal, guard };
  }
  return {
    key,
    capture,
    canRead: Boolean(reader) && currentFilesAvailable(cache, clientId),
    canWrite:
      Boolean(currentClientWriter(cache)) &&
      currentFilesAvailable(cache, clientId),
  };
}
