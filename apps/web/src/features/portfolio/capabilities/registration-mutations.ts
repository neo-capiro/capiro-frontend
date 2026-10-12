"use client";
import { useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { clientKey, clientsKey } from "@/features/portfolio/index/public";
import type { Client } from "@/features/portfolio/index/contracts-public";
import { useCapabilityExecution } from "./execution";
import { fitKey } from "./queries";
import {
  saveRegistrations,
  type RegistrationInput,
} from "./registration-writer";

export function useSaveRegistrations(
  clientId: string,
  editing: boolean,
  onSaved: () => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useCapabilityExecution(
    clientId,
    "registrations",
    editing,
    true,
  );
  useSyncExternalStore(
    (notify) => cache.getQueryCache().subscribe(notify),
    () => cache.getQueryState<Client>(clientKey(clientId)),
    () => undefined,
  );
  const currentClient = () => {
    const state = cache.getQueryState<Client>(clientKey(clientId));
    return state?.status === "success" &&
      !state.error &&
      !state.isInvalidated &&
      state.fetchStatus === "idle" &&
      state.data?.id === clientId
      ? state
      : undefined;
  };
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
