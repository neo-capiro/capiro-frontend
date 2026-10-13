import type { QueryClient } from "@tanstack/react-query";
import type { FunnelSession } from "@/shared/capiro/onboard-contracts";
import { CapiroApiError } from "@/shared/capiro/http";
import { FUNNEL_SESSION_KEY } from "./funnel-lifetime";

type SessionReader = () => Promise<FunnelSession>;

/** Shared by observed and deliberate reads; native 404 means not registered. */
export function funnelSessionQuery(request: SessionReader) {
  return {
    queryKey: FUNNEL_SESSION_KEY,
    queryFn: async () => {
      try {
        return await request();
      } catch (error) {
        if (error instanceof CapiroApiError && error.status === 404)
          return null;
        throw error;
      }
    },
    retry: false as const,
    staleTime: 5_000,
  };
}

/** Latest explicit read owns success/error; cancelled older results cannot publish. */
export function refreshFunnelSession(
  cache: QueryClient,
  request: SessionReader,
) {
  // Cancellation updates query state synchronously and prevents the old promise
  // from publishing even when a transport cannot physically stop its read.
  void cache.cancelQueries(
    { queryKey: FUNNEL_SESSION_KEY, exact: true },
    { silent: true },
  );
  return cache.fetchQuery({ ...funnelSessionQuery(request), staleTime: 0 });
}
