"use client";
import { useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { clientKey, clientsKey } from "@/features/portfolio/index/public";
import { clientReadKey } from "@/features/portfolio/clients/public";
import { useCurrentActor } from "@/shared/portfolio/auth/current-actor";
import type { QueryClient } from "@tanstack/react-query";
import type { Client } from "@/features/portfolio/index/contracts-public";
import { useCapabilityExecution } from "./execution";
import { fitKey } from "./queries";
import {
  saveRegistrations,
  type RegistrationInput,
} from "./registration-writer";

/**
 * The registration write guard's source of truth: the state of the key the FORM displays.
 * A missing, errored, invalidated, fetching or foreign row is not writable — the existing
 * fail-closed rules, applied to the actor-scoped entry instead of the actor-less prefix.
 */
export function registrationClientState(
  cache: QueryClient,
  scopedKey: readonly unknown[],
  clientId: string,
) {
  const state = cache.getQueryState<Client>(scopedKey);
  return state?.status === "success" &&
    !state.error &&
    !state.isInvalidated &&
    state.fetchStatus === "idle" &&
    state.data?.id === clientId
    ? state
    : undefined;
}

export function useSaveRegistrations(
  clientId: string,
  editing: boolean,
  onSaved: () => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  // Readiness, the captured revision and the result readback all follow the entry the FORM
  // displays — the current actor's scoped detail — not the actor-less prefix. With the
  // actor unknown the key is not a real entry, so the existing guard refuses the write.
  const actor = useCurrentActor();
  const scopedKey = clientReadKey(clientId, actor);
  const scope = useCapabilityExecution(
    clientId,
    "registrations",
    editing,
    true,
  );
  useSyncExternalStore(
    (notify) => cache.getQueryCache().subscribe(notify),
    () => cache.getQueryState<Client>(scopedKey),
    () => undefined,
  );
  const currentClient = () =>
    registrationClientState(cache, scopedKey, clientId);
  const mutation = useMutation({
    mutationFn: (body: RegistrationInput) =>
      scope.run(async (execution) => {
        const initial = currentClient();
        if (!initial)
          throw new ApiError(
            409,
            "Refresh this client's registrations before saving.",
          );
        const receipt = await saveRegistrations(api, clientId, body, {
          ...execution,
          guard: () => {
            execution.guard();
            if (currentClient()?.dataUpdateCount !== initial.dataUpdateCount)
              throw new ApiError(
                409,
                "Registration details changed while saving. Review the current client before retrying.",
              );
          },
        });
        execution.guard();
        await Promise.all([
          cache.invalidateQueries({ queryKey: clientKey(clientId) }),
          cache.invalidateQueries({ queryKey: clientsKey }),
          cache.invalidateQueries({ queryKey: fitKey(clientId) }),
        ]);
        execution.guard();
        if (!currentClient())
          throw new ApiError(
            409,
            "The save was acknowledged, but current registrations could not be loaded. Retry the client read before making another change.",
          );
        onSaved();
        return receipt;
      }),
  });
  return {
    ...mutation,
    canEdit: scope.hasWriter && Boolean(currentClient()),
    canWrite: scope.canWrite && Boolean(currentClient()),
  };
}
