"use client";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import {
  assertClientWriter,
  currentClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import type { CapabilityExecution } from "./writer";

function assertCapabilityWriter(
  cache: QueryClient,
  actor: ClientWriter,
  administrator: boolean,
) {
  assertClientWriter(cache, actor);
  if (
    administrator &&
    !canAdminister(
      cache.getQueryData<{ role?: string | null }>(["identity"])?.role,
    )
  )
    throw new ApiError(403, "Registration edits require an administrator.");
}

/** Capability and registration writes share one captured client-view lifetime. */
export function useCapabilityExecution(
  clientId: string,
  context: string,
  open: boolean,
  administrator = false,
) {
  const cache = useQueryClient();
  useIdentity();
  // Invalidating without refetch can leave useQuery's data unchanged. Observe
  // the actual identity state so these revocations also disable the controls.
  const identityState = useSyncExternalStore(
    (notify) =>
      cache.getQueryCache().subscribe((event) => {
        if (event.query.queryKey[0] === "identity") notify();
      }),
    () => cache.getQueryState(["identity"]),
    () => undefined,
  );
  const actor = currentClientWriter(cache);
  const userId = actor?.userId;
  const tenantId = actor?.tenantId;
  const allowed =
    Boolean(actor) &&
    (!administrator ||
      canAdminister(
        cache.getQueryData<{ role?: string | null }>(["identity"])?.role,
      ));
  const lifetime = useRef<AbortController | null>(null);
  const writing = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    const unsubscribe = cache.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] !== "identity" || !userId || !tenantId)
        return;
      try {
        assertCapabilityWriter(cache, { userId, tenantId }, administrator);
      } catch {
        controller.abort();
      }
    });
    return () => {
      controller.abort();
      unsubscribe();
      if (writing.current === controller) writing.current = null;
    };
  }, [
    cache,
    clientId,
    context,
    open,
    administrator,
    userId,
    tenantId,
    identityState?.dataUpdateCount,
  ]);
  const run = async <T>(
    work: (execution: CapabilityExecution) => Promise<T>,
  ) => {
    const controller = lifetime.current;
    const initiating = currentClientWriter(cache);
    if (
      !open ||
      !controller ||
      controller.signal.aborted ||
      !initiating ||
      initiating.userId !== userId ||
      initiating.tenantId !== tenantId
    )
      throw new ApiError(
        403,
        "Reopen this client view with a current session before making changes.",
      );
    if (writing.current)
      throw new ApiError(409, "A change is already in progress in this view.");
    const execution = {
      signal: controller.signal,
      guard: () => {
        controller.signal.throwIfAborted();
        assertCapabilityWriter(cache, initiating, administrator);
      },
    };
    writing.current = controller;
    try {
      execution.guard();
      return await work(execution);
    } finally {
      if (writing.current === controller) writing.current = null;
    }
  };
  return { run, canWrite: open && allowed, hasWriter: allowed };
}
