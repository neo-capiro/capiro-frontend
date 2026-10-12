"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError } from "@/shared/portfolio/api/http";
import { useCapabilityExecution } from "./execution";
import { capabilitiesKey, fitKey } from "./queries";
import type { Capability } from "./contracts";
import {
  saveCapability,
  removeCapability,
  refreshCapabilityFit,
  type CapabilityChange,
} from "./writer";

export function useCapabilityMutation(
  clientId: string,
  capabilityId: string | undefined,
  open: boolean,
  onSaved: () => void,
) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useCapabilityExecution(clientId, capabilityId ?? "new", open);
  const currentList = () =>
    cache.getQueryState<Capability[]>(capabilitiesKey(clientId));
  const listReady = () => {
    const state = currentList();
    return (
      state?.status === "success" &&
      !state.error &&
      !state.isInvalidated &&
      state.fetchStatus === "idle"
    );
  };
  const mutation = useMutation({
    mutationFn: (change: CapabilityChange) =>
      scope.run(async (execution) => {
        if (!listReady())
          throw new ApiError(
            409,
            "Refresh the capability list before making changes.",
          );
        if (
          capabilityId &&
          !currentList()?.data?.some((record) => record.id === capabilityId)
        )
          throw new ApiError(
            404,
            "This capability is no longer available in the current client profile.",
          );
        if (change.type === "remove" && !capabilityId)
          throw new ApiError(400, "Save the capability before removing it.");
        const receipt =
          change.type === "save"
            ? await saveCapability(
                api,
                clientId,
                capabilityId,
                change.body,
                execution,
              )
            : await removeCapability(api, clientId, capabilityId!, execution);
        execution.guard();
        const refreshing = Promise.all([
          cache.invalidateQueries({ queryKey: capabilitiesKey(clientId) }),
          cache.invalidateQueries({ queryKey: fitKey(clientId) }),
        ]);
        // Removing the selected row unmounts its editor during the list read.
        // Close the acknowledged confirmation while this scope is still valid;
        // there are no further view/cache effects after the refresh settles.
        if (change.type === "remove") {
          execution.guard();
          onSaved();
          await refreshing;
          return receipt;
        }
        await refreshing;
        execution.guard();
        onSaved();
        return receipt;
      }),
  });
  return { ...mutation, canWrite: scope.canWrite && listReady() };
}

export function useRefreshFit(clientId: string, available: boolean) {
  const api = useApi();
  const cache = useQueryClient();
  const scope = useCapabilityExecution(clientId, "fit", true);
  const mutation = useMutation({
    mutationFn: () =>
      scope.run(async (execution) => {
        const state = cache.getQueryState(fitKey(clientId));
        if (
          !available ||
          state?.status !== "success" ||
          state.error ||
          state.isInvalidated ||
          state.fetchStatus !== "idle"
        )
          throw new ApiError(
            409,
            "Retry the capability fit read before refreshing matches.",
          );
        const receipt = await refreshCapabilityFit(api, clientId, execution);
        execution.guard();
        const current = cache.getQueryState(fitKey(clientId));
        if (
          current?.status !== "success" ||
          current.error ||
          current.isInvalidated ||
          current.fetchStatus !== "idle" ||
          current.dataUpdateCount !== state.dataUpdateCount
        )
          throw new ApiError(
            409,
            "Capability fit changed while refreshing. Review the current results before retrying.",
          );
        cache.setQueryData(fitKey(clientId), receipt);
        return receipt;
      }),
  });
  return { ...mutation, canWrite: scope.canWrite && available };
}
