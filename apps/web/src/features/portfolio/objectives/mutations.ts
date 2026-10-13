"use client";
import { useLayoutEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  currentClientWriter,
  assertClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { objectivesKey } from "./queries";
import {
  saveObjective,
  deleteObjective,
  type SaveObjective,
  type ObjectiveAction,
  type ObjectiveExecution,
} from "./writer";
import type { Objective } from "./contracts";

// A browser lifetime/actor check prevents a stale response from continuing the
// second write or closing another editor. Server authorization remains canonical.
function useObjectiveExecution(clientId: string, open: boolean) {
  const cache = useQueryClient();
  const identity = useIdentity();
  const actor = currentClientWriter(cache);
  const lifetime = useRef<AbortController | null>(null);
  const writing = useRef(false);
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [
    clientId,
    open,
    cache,
    identity.data?.user.id,
    identity.data?.tenant?.id,
  ]);
  const run = async <T>(
    work: (execution: ObjectiveExecution) => Promise<T>,
  ) => {
    const controller = lifetime.current;
    if (!open || !actor || !controller || controller.signal.aborted)
      throw new ApiError(
        403,
        "Reopen the objective with a current session before saving.",
      );
    if (writing.current)
      throw new ApiError(409, "An objective operation is already in progress.");
    const execution = {
      signal: controller.signal,
      guard: () => {
        controller.signal.throwIfAborted();
        assertClientWriter(cache, actor);
      },
    };
    writing.current = true;
    try {
      execution.guard();
      return await work(execution);
    } finally {
      writing.current = false;
    }
  };
  return { run, canWrite: open && Boolean(actor) };
}

export function useSaveObjective(
  clientId: string,
  input: SaveObjective,
  onPersisted: (record: Objective) => void,
  onSaved: () => void,
  open = true,
) {
  const api = useApi();
  const cache = useQueryClient();
  const invalidate = () =>
    cache.invalidateQueries({ queryKey: objectivesKey(clientId) });
  const scope = useObjectiveExecution(clientId, open);
  const mutation = useMutation({
    mutationFn: (action: ObjectiveAction) =>
      scope.run(async (execution) => {
        try {
          const saved = await saveObjective(
            api,
            clientId,
            input,
            action,
            onPersisted,
            execution,
          );
          await invalidate();
          execution.guard();
          onSaved();
          return saved;
        } catch (error) {
          // Do not refill a new actor's cache after an old request settles.
          if (!execution.signal?.aborted) {
            execution.guard();
            await invalidate();
          }
          throw error;
        }
      }),
  });
  return { ...mutation, canWrite: scope.canWrite };
}
export function useDeleteObjective(
  clientId: string,
  onRemoved: () => void,
  open = true,
) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useObjectiveExecution(clientId, open);
  const mutation = useMutation({
    mutationFn: (objective: Objective) =>
      scope.run(async (execution) => {
        const receipt = await deleteObjective(
          api,
          clientId,
          objective,
          execution,
        );
        await cache.invalidateQueries({ queryKey: objectivesKey(clientId) });
        execution.guard();
        onRemoved();
        return receipt;
      }),
  });
  return { ...mutation, canWrite: scope.canWrite };
}
