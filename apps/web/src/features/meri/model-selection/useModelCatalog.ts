"use client";
import { useQuery } from "@tanstack/react-query";
import type { UserPreferencesOwner } from "@capiro/meri-client/user-preferences";
import { userPreferencesTransport } from "../../../shared/meri-user-preferences/transport";

/** Read-only catalog; the existing preference controller remains the sole default writer. */
export function useModelCatalog(owner: UserPreferencesOwner, enabled: boolean) {
  const result = useQuery({
    queryKey: ["meri-model-catalog", owner.tenantId, owner.actorId],
    enabled,
    retry: false,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const response = await userPreferencesTransport(
        owner,
        () => !signal.aborted,
      ).read(signal);
      if ("error" in response) throw new Error("Model choices unavailable");
      return response;
    },
  });
  return {
    document: enabled && !result.isError ? result.data : undefined,
    loading: enabled && result.isPending,
    refresh: () => {
      void result.refetch();
    },
  };
}
