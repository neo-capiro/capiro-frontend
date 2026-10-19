import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    __acceptanceRelationships?: {
      refresh: (queryKey: readonly string[]) => void;
    };
  }
}

/** Only the refetch trigger is synthetic; production components own every read. */
export function AcceptanceRelationshipsProbe() {
  const cache = useQueryClient();
  useEffect(() => {
    const control = {
      refresh: (queryKey: readonly string[]) => {
        void cache.refetchQueries({ queryKey });
      },
    };
    window.__acceptanceRelationships = control;
    return () => {
      if (window.__acceptanceRelationships === control)
        delete window.__acceptanceRelationships;
    };
  }, [cache]);
  return null;
}
