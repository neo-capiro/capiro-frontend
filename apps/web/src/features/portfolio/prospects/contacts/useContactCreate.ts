"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { assertClientWriter } from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import { useRetainedIntent } from "@/shared/session/recovery/useRetainedIntent";
import { readContacts } from "./api";
import {
  createContract,
  createScope,
  runContactCreate,
} from "./create-command";
import { contactsKey } from "./queries";
import type { ContactInput } from "./contracts";

export function useContactCreate(prospectId: string) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  const actor = {
    tenantId: identity.data?.tenant?.id ?? "",
    userId: identity.data?.user.id ?? "",
  };
  const recovery = useRetainedIntent(
    createScope(actor, prospectId),
    createContract,
    async (signal, guard) => {
      assertClientWriter(cache, actor);
      await verifyCoreWriter(api, actor, signal, guard);
      await readContacts(api, prospectId, signal);
      guard();
    },
  );
  const mutation = useMutation({
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
        prospectId,
        action,
        guard,
        recovery.signal(),
        recovery.install,
      );
    },
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: contactsKey(prospectId) }),
  });
  return {
    ready: recovery.ready,
    loading: recovery.loading,
    attempt: recovery.record,
    pending: mutation.isPending,
    error: recovery.error ? new Error(recovery.error) : mutation.error,
    reload: recovery.retry,
    save: (values: ContactInput) =>
      mutation.mutateAsync({
        kind: "save",
        values,
        expected: recovery.record ?? undefined,
      }),
    retry: () =>
      recovery.record
        ? mutation.mutateAsync({ kind: "retry", expected: recovery.record })
        : Promise.reject(new Error("No saved contact creation")),
  };
}
export type ContactCreation = ReturnType<typeof useContactCreate>;
