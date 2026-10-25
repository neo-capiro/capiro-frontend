"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { CapiroApiError } from "@/shared/capiro/http";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { identitySchema } from "@/shared/portfolio/auth/identity";
import { assertClientWriter } from "@/shared/portfolio/auth/client-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import type { ProspectWriter } from "@/features/modules/workspace/prospect-actions-public";
import type { Prospect } from "../../contracts";
import { clientBriefCopyScope } from "./command";
import { clientBriefCopyRecoveryContract } from "./contracts";
import { runClientBriefCopy, type ClientBriefCopyAction } from "./recovery";
import { readClientBriefReview, type ClientBriefSelection } from "./review";
import { ClientBriefAccessError, verifyClientBriefAccess } from "./authority";

export function useClientBriefCopy(actor: ProspectWriter, record: Prospect) {
  const api = useApi(),
    workspace = useCapiro(),
    cache = useQueryClient();
  const assertActor = () => {
    assertClientWriter(cache, actor);
    if (
      identitySchema.parse(cache.getQueryData(["identity"])).user
        .clerkUserId !== actor.ownerId
    )
      throw new ApiError(
        403,
        "The signed-in owner changed. Restore the original account before continuing.",
      );
  };
  const recovery = useRetainedIntent(
    clientBriefCopyScope(actor, record.id),
    clientBriefCopyRecoveryContract,
    async (signal, guard) => {
      assertActor();
      await verifyClientBriefAccess(
        api,
        workspace,
        actor,
        record.id,
        record.linkedClientId!,
        signal,
        guard,
      );
      signal.throwIfAborted();
      assertActor();
    },
  );
  const saved = recovery.record;
  const contextError =
    saved &&
    (saved.tenantId !== actor.tenantId ||
      saved.userId !== actor.userId ||
      saved.actorId !== actor.ownerId ||
      saved.command.prospectId !== record.id ||
      saved.command.clientId !== record.linkedClientId)
      ? "An original brief copy is held for a different linked client or account. Restore its original context before recovery; no new copy will be sent."
      : undefined;
  const guard = () => {
    recovery.guard();
    assertActor();
  };
  const verify = async () => {
    try {
      await recovery.verify();
    } catch (error) {
      recovery.block(error);
      throw error;
    }
  };
  const review = useMutation({
    retry: false,
    mutationFn: async (selection: ClientBriefSelection) => {
      const pinned = structuredClone(selection);
      await verify();
      return readClientBriefReview(
        api,
        { tenantId: actor.tenantId, prospectId: record.id },
        record.linkedClientId!,
        pinned,
        recovery.signal(),
        guard,
      );
    },
  });
  const action = useMutation({
    retry: false,
    mutationFn: async (input: ClientBriefCopyAction) => {
      const pinned = structuredClone(input);
      if (!recovery.ready)
        throw new Error("Restore saved-command recovery before continuing.");
      if (contextError) throw new Error(contextError);
      await verify();
      return runClientBriefCopy(
        api,
        workspace,
        actor,
        record.id,
        record.linkedClientId!,
        pinned,
        guard,
        recovery.signal(),
        recovery.install,
      );
    },
    onError: (error) => {
      if (
        error instanceof ClientBriefAccessError ||
        error instanceof ApiError ||
        (error instanceof CapiroApiError &&
          [401, 403, 404].includes(error.status))
      )
        recovery.block(error);
    },
  });
  return { recovery, review, action, contextError };
}
