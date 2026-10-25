"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  assertClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import { filesKey } from "./file-reader";
import {
  fileDeletionRecoveryContract,
  fileDeletionScope,
} from "./deletion-contract";
import {
  FileDeletionAccessError,
  verifyFileDeletionAccess,
} from "./deletion-review";
import { deleteClientFile, type FileDeletionAction } from "./deletion";

export function useFileDeletion(clientId: string, actor: ClientWriter) {
  const api = useApi(),
    cache = useQueryClient();
  const recovery = useRetainedIntent(
    fileDeletionScope(actor, clientId),
    fileDeletionRecoveryContract,
    async (signal, guard) => {
      assertClientWriter(cache, actor);
      await verifyFileDeletionAccess(api, actor, clientId, signal, guard);
      assertClientWriter(cache, actor);
    },
  );
  const guard = () => {
    recovery.guard();
    assertClientWriter(cache, actor);
  };
  const saved = recovery.record;
  const contextError =
    saved &&
    (saved.tenantId !== actor.tenantId ||
      saved.userId !== actor.userId ||
      saved.command.clientId !== clientId)
      ? "Restore the original client and account before recovering this deletion."
      : undefined;
  const action = useMutation({
    retry: false,
    mutationFn: async (input: FileDeletionAction) => {
      const pinned = structuredClone(input);
      if (!recovery.ready || contextError)
        throw new Error(
          contextError ?? "Restore saved deletion recovery before continuing.",
        );
      try {
        await recovery.verify();
      } catch (error) {
        recovery.block(error);
        throw error;
      }
      return deleteClientFile(
        api,
        actor,
        clientId,
        pinned,
        recovery.signal(),
        guard,
        recovery.install,
      );
    },
    onSuccess: () => {
      void cache.invalidateQueries({ queryKey: filesKey(clientId) });
    },
    onError: (error) => {
      if (
        error instanceof FileDeletionAccessError ||
        (error instanceof ApiError && [401, 403, 404].includes(error.status))
      )
        recovery.block(error);
    },
  });
  return { recovery, action, contextError };
}
