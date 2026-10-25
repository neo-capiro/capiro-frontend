"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { assertClientWriter } from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import { peopleKey } from "@/features/portfolio/relationships/contact-public";
import type { Prospect } from "../contracts";
import { contactsKey } from "../contacts/queries";
import { transferScope } from "./command";
import { transferRecoveryContract } from "./contracts";
import { runContactTransfer, type TransferAction } from "./recovery";
import { readTransferReview } from "./review";

export function useContactTransfer(record: Prospect) {
  const api = useApi(),
    cache = useQueryClient(),
    identity = useIdentity();
  const actor = {
    tenantId: identity.data?.tenant?.id ?? "",
    userId: identity.data?.user.id ?? "",
  };
  const clientId = record.linkedClientId ?? "";
  const recovery = useRetainedIntent(
    transferScope(actor, record.id),
    transferRecoveryContract,
    async (signal, guard) => {
      assertClientWriter(cache, actor);
      await verifyCoreWriter(api, actor, signal, guard);
      await readTransferReview(api, record.id, clientId, signal, guard);
      assertClientWriter(cache, actor);
    },
  );
  const saved = recovery.record;
  const contextError =
    saved &&
    (saved.tenantId !== actor.tenantId.toLowerCase() ||
      saved.actorUserId !== actor.userId.toLowerCase() ||
      saved.command.prospectId !== record.id ||
      saved.command.clientId !== clientId)
      ? "An original contact transfer is held for a different account or linked client. Restore its original context before recovery; no new transfer will be sent."
      : undefined;
  const guard = () => {
    recovery.guard();
    assertClientWriter(cache, actor);
  };
  const verify = async () => {
    try {
      await recovery.verify();
    } catch (error) {
      // Hide the installed view when current access cannot be verified; the
      // encrypted command remains available for an explicit recovery retry.
      recovery.block(error);
      throw error;
    }
  };
  const review = useMutation({
    retry: false,
    mutationFn: async () => {
      await verify();
      return readTransferReview(
        api,
        record.id,
        clientId,
        recovery.signal(),
        guard,
      );
    },
  });
  const action = useMutation({
    retry: false,
    mutationFn: async (input: TransferAction) => {
      if (!recovery.ready)
        throw new Error("Restore saved-command recovery before continuing.");
      if (contextError) throw new Error(contextError);
      await verify();
      return runContactTransfer(
        api,
        actor,
        record.id,
        input,
        guard,
        recovery.signal(),
        recovery.install,
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status))
        recovery.block(error);
    },
    onSettled: () =>
      Promise.all([
        cache.invalidateQueries({ queryKey: contactsKey(record.id) }),
        cache.invalidateQueries({ queryKey: peopleKey(clientId) }),
      ]),
  });
  return { recovery, review, action, contextError };
}
