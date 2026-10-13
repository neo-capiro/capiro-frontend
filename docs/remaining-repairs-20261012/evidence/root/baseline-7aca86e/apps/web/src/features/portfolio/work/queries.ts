"use client";
import { useQuery, useQueries } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import {
  strategySummarySchema,
  strategyDetailFor,
  workspaceDraftSchema,
} from "./contracts";
export function useStrategies(clientId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["strategies", clientId],
    queryFn: async ({ signal }) => {
      const all = await api.request(
        "strategy",
        "strategies",
        z.array(strategySummarySchema),
        { signal },
      );
      signal.throwIfAborted();
      return all.filter((strategy) => strategy.clientId === clientId);
    },
  });
}
export function useStrategyDetails(clientId: string, ids: string[]) {
  const api = useApi();
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["strategy-detail", clientId, id],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const detail = await api.request(
          "strategy",
          `strategies/${encodeURIComponent(id)}`,
          strategyDetailFor(id, clientId),
          { signal },
        );
        signal.throwIfAborted();
        return detail;
      },
    })),
  });
}
export function useWorkspaceDrafts() {
  const api = useApi();
  return useQuery({
    queryKey: ["workspace-drafts"],
    queryFn: ({ signal }) =>
      api.request(
        "workspace",
        "drafts?scope=all",
        z.object({ drafts: z.array(workspaceDraftSchema) }),
        { signal },
      ),
  });
}
