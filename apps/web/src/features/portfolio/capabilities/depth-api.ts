"use client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { useCapabilityExecution } from "./execution";
import { capabilitiesKey, fitKey } from "./queries";
import {
  portfolioDepthSchema,
  trackingFeedSchema,
  discoveryResultSchema,
} from "./depth-contracts";
import {
  portfolioProposalSchema,
  type PortfolioProposal,
  type ReviewAction,
} from "./proposal-contracts";

export const portfolioDepthKey = (clientId: string) =>
  ["portfolio-depth", "client", clientId] as const;
export const discoveryResultsKey = (clientId: string) =>
  ["capability-discovery", "client", clientId] as const;
export function useDiscoveryResults(clientId: string, businessUnitId?: string) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: [...discoveryResultsKey(clientId), businessUnitId ?? "all"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => {
      const search = new URLSearchParams({ limit: "12" });
      if (pageParam) search.set("after", pageParam);
      if (businessUnitId) search.set("businessUnitId", businessUnitId);
      return api.request(
        "core",
        `clients/${clientId}/capabilities/discovery/results?${search}`,
        discoveryResultSchema,
        { signal },
      );
    },
    getNextPageParam: (result) =>
      result.hasMore ? (result.nextCursor ?? undefined) : undefined,
  });
}
export function usePortfolioDepth(clientId: string) {
  const api = useApi();
  return useQuery({
    queryKey: portfolioDepthKey(clientId),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `clients/${clientId}/portfolio/depth`,
        portfolioDepthSchema,
        { signal },
      ),
  });
}
export const capabilityTrackingKey = (
  clientId: string,
  capabilityId?: string,
) =>
  [
    "capability-tracking",
    "client",
    clientId,
    ...(capabilityId ? [capabilityId] : []),
  ] as const;
export function useCapabilityTracking(clientId: string, capabilityId: string) {
  const api = useApi();
  return useQuery({
    queryKey: capabilityTrackingKey(clientId, capabilityId),
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `clients/${clientId}/capabilities/${capabilityId}/tracking`,
        trackingFeedSchema,
        { signal },
      ),
  });
}
export function reviewPath(proposal: PortfolioProposal) {
  switch (proposal.kind) {
    case "capability":
    case "business_unit":
      return `capabilities/discovery/proposals/${proposal.id}/review`;
    case "alignment":
      return `capabilities/${proposal.capabilityId}/alignment/${proposal.id}/review`;
    case "office_recommendation":
    case "statement":
      return `targets/recommendations/${proposal.id}/review`;
    case "case_field":
      return `portfolio/case/${proposal.id}/review`;
    case "sector_anchor":
      return `portfolio/sectors/${proposal.id}/review`;
  }
}
export function usePortfolioCommand<T, R>(
  clientId: string,
  context: string,
  send: (input: T) => {
    path: string;
    method?: string;
    body: unknown;
    schema: z.ZodType<R>;
  },
) {
  const api = useApi();
  const cache = useQueryClient();
  const execution = useCapabilityExecution(clientId, context, true);
  const query = usePortfolioDepth(clientId);
  const mutation = useMutation({
    mutationFn: (input: T) =>
      execution.run(async (scope) => {
        const command = send(input);
        scope.guard();
        const result = await api.request(
          "core",
          `clients/${clientId}/${command.path}`,
          command.schema,
          {
            method: command.method ?? "POST",
            body: command.body,
            signal: scope.signal,
          },
        );
        scope.guard();
        await Promise.all([
          cache.invalidateQueries({ queryKey: portfolioDepthKey(clientId) }),
          cache.invalidateQueries({ queryKey: discoveryResultsKey(clientId) }),
          cache.invalidateQueries({ queryKey: capabilitiesKey(clientId) }),
          cache.invalidateQueries({ queryKey: fitKey(clientId) }),
          cache.invalidateQueries({ queryKey: ["client-targets", clientId] }),
          cache.invalidateQueries({
            queryKey: capabilityTrackingKey(clientId),
          }),
        ]);
        return result;
      }),
  });
  return {
    ...mutation,
    canWrite:
      execution.canWrite &&
      query.isSuccess &&
      !query.error &&
      !query.isFetching &&
      !mutation.isPending,
  };
}
export function useProposalReview(clientId: string) {
  return usePortfolioCommand(
    clientId,
    "proposal-review",
    ({
      proposal,
      action,
    }: {
      proposal: PortfolioProposal;
      action: ReviewAction;
    }) => ({
      path: reviewPath(proposal),
      body: { expectedVersion: proposal.version, action },
      schema: portfolioProposalSchema,
    }),
  );
}
