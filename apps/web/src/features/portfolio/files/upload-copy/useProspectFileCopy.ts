"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  assertClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import { prospectFileCopyScope } from "./command";
import { prospectFileCopyRecoveryContract } from "./contracts";
import { runProspectFileCopy, type ProspectFileCopyAction } from "./recovery";
import {
  ProspectFileCopyAccessError,
  readProspectFileCopyReview,
  verifyProspectFileCopyAccess,
  type ProspectUploadSelection,
} from "./review";

export function useProspectFileCopy(
  actor: ClientWriter,
  prospectId: string,
  clientId: string,
) {
  const api = useApi(),
    cache = useQueryClient();
  const assertActor = () => assertClientWriter(cache, actor);
  const recovery = useRetainedIntent(
    prospectFileCopyScope(actor, prospectId),
    prospectFileCopyRecoveryContract,
    async (signal, guard) => {
      assertActor();
      await verifyProspectFileCopyAccess(
        api,
        actor,
        prospectId,
        clientId,
        signal,
        guard,
      );
      assertActor();
    },
  );
  const guard = () => {
    recovery.guard();
    assertActor();
  };
  const saved = recovery.record;
  const contextError =
    saved &&
    (saved.tenantId !== actor.tenantId ||
      saved.userId !== actor.userId ||
      saved.command.prospectId !== prospectId ||
      saved.command.clientId !== clientId)
      ? "A copy is held for another account or linked client. Restore its original context."
      : undefined;
  const verify = async () => {
    try {
      await recovery.verify();
    } catch (error) {
      recovery.block(error);
      throw error;
    }
  };
  const onError = (error: Error) => {
    if (
      error instanceof ProspectFileCopyAccessError ||
      (error instanceof ApiError && [401, 403, 404].includes(error.status))
    )
      recovery.block(error);
  };
  const review = useMutation({
    retry: false,
    onError,
    mutationFn: async (selection: ProspectUploadSelection) => {
      const pinned = structuredClone(selection);
      await verify();
      return readProspectFileCopyReview(
        api,
        actor,
        prospectId,
        clientId,
        pinned,
        recovery.signal(),
        guard,
      );
    },
  });
  const action = useMutation({
    retry: false,
    onError,
    mutationFn: async (input: ProspectFileCopyAction) => {
      const pinned = structuredClone(input);
      if (!recovery.ready || contextError)
        throw new Error(
          contextError ?? "Restore saved-command recovery before continuing.",
        );
      await verify();
      return runProspectFileCopy(
        api,
        actor,
        prospectId,
        clientId,
        pinned,
        guard,
        recovery.signal(),
        recovery.install,
      );
    },
  });
  return { recovery, review, action, contextError };
}
