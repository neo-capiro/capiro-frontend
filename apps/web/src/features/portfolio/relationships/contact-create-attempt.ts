"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { assertClientWriter } from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import {
  contactCreateContract,
  contactCreateScope,
  runContactCreate,
} from "./contact-create-command";
import { peopleKey } from "./queries";

export function useContactCreateAttempt(clientId: string) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  const actor = {
    tenantId: identity.data?.tenant?.id ?? "",
    userId: identity.data?.user.id ?? "",
  };
  const recovery = useRetainedIntent(
    contactCreateScope(actor, clientId),
    contactCreateContract,
    async (signal, guard) => {
      assertClientWriter(cache, actor);
      await verifyCoreWriter(api, actor, signal, guard);
    },
  );
  const mutation = useMutation({
    mutationKey: ["contact-create-command", clientId],
    retry: false,
    mutationFn: async (action: Parameters<typeof runContactCreate>[3]) => {
      const guard = () => {
        recovery.guard();
        assertClientWriter(cache, actor);
      };
      await recovery.verify();
      return runContactCreate(
        api,
        actor,
        clientId,
        action,
        guard,
        recovery.signal(),
        recovery.install,
      );
    },
    onSettled: () => cache.invalidateQueries({ queryKey: peopleKey(clientId) }),
  });
  return {
    ready: recovery.ready,
    attempt: recovery.record,
    busy: mutation.isPending,
    error: recovery.error ?? mutation.error?.message,
    receipt: mutation.data,
    reload: recovery.retry,
    save: (
      values: Extract<
        Parameters<typeof runContactCreate>[3],
        { kind: "save" }
      >["values"],
    ) => mutation.mutateAsync({ kind: "save", values }),
    recover: (kind: "check" | "retry") =>
      recovery.record
        ? mutation.mutateAsync({ kind, expected: recovery.record })
        : Promise.reject(new Error("No saved contact attempt")),
  };
}
export type ContactCreation = ReturnType<typeof useContactCreateAttempt>;
