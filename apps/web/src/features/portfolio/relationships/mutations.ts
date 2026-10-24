"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  canManageContacts,
  writePerson,
  type PersonChange,
} from "./contact-api";
import { peopleKey } from "./queries";
import type { ContactCreation } from "./contact-create-attempt";
export type { PersonChange } from "./contact-api";
export const peopleWriteKey = (clientId: string) =>
  ["client-people-write", clientId] as const;
export function usePersonMutation(
  clientId: string,
  onSaved?: () => void,
  creation?: ContactCreation,
) {
  const api = useApi();
  const cache = useQueryClient();
  const identity = useIdentity();
  const lifetime = useRef({ active: false });
  useLayoutEffect(() => {
    const current = { active: true };
    lifetime.current = current;
    return () => {
      current.active = false;
    };
  }, [clientId, identity.data?.tenant?.id, identity.data?.user.id]);
  const mutation = useMutation({
    mutationKey: peopleWriteKey(clientId),
    retry: false,
    onMutate: () => lifetime.current,
    mutationFn: async (change: PersonChange) => {
      if (
        !lifetime.current.active ||
        !identity.isSuccess ||
        identity.isFetching ||
        identity.error ||
        !canManageContacts(identity.data?.role)
      )
        throw new ApiError(
          403,
          "Your role cannot change organization contacts.",
        );
      const roster = cache.getQueryState(peopleKey(clientId));
      if (
        roster?.status !== "success" ||
        roster.error ||
        roster.fetchStatus !== "idle"
      )
        throw new ApiError(
          409,
          "Read the current contact roster before changing it.",
        );
      // The currently executing mutation is already counted. Refuse a second
      // synchronous submission, including another drawer/hierarchy control.
      if (cache.isMutating({ mutationKey: peopleWriteKey(clientId) }) > 1)
        throw new ApiError(
          409,
          "Wait for the current contact change to finish.",
        );
      if (change.kind === "save" && !change.id) {
        if (!creation?.ready)
          throw new ApiError(
            409,
            "Load the saved contact attempt before creating a contact.",
          );
        return creation.save(change.body);
      }
      return writePerson(api, clientId, change);
    },
    onSuccess: async (_result, _change, scope) => {
      await cache.invalidateQueries({ queryKey: peopleKey(clientId) });
      if (scope?.active) onSaved?.();
    },
    onError: async () => {
      // An uncertain receipt can follow a committed write. Read back the roster;
      // never turn a failed/foreign receipt into a successful-looking close.
      await cache.invalidateQueries({ queryKey: peopleKey(clientId) });
    },
  });
  return {
    ...mutation,
    mutate: (...args: Parameters<typeof mutation.mutate>) => {
      if (cache.isMutating({ mutationKey: peopleWriteKey(clientId) }) === 0)
        mutation.mutate(...args);
    },
  };
}
