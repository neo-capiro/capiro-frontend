import type { QueryClient, QueryFunctionContext } from "@tanstack/react-query";
import type { FunnelSession } from "@/shared/capiro/onboard-contracts";
import { CapiroApiError } from "@/shared/capiro/http";
import { FUNNEL_SESSION_KEY } from "./funnel-lifetime";

type SessionReader = () => Promise<FunnelSession>;

/** Shared by observed and deliberate reads; native 404 means not registered. */
export function funnelSessionQuery(
  request: SessionReader,
  captureSignal?: (signal: AbortSignal) => void,
) {
  return {
    queryKey: FUNNEL_SESSION_KEY,
    queryFn: async ({
      signal,
    }: QueryFunctionContext<typeof FUNNEL_SESSION_KEY>) => {
      captureSignal?.(signal);
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
  let dispatchedSignal: AbortSignal | undefined;
  return cache
    .fetchQuery({
      ...funnelSessionQuery(request, (signal) => {
        dispatchedSignal = signal;
      }),
      staleTime: 0,
    })
    .then((value) => {
      // TanStack silent cancellation may adopt the replacement retryer's promise.
      // Only this reader's original non-aborted dispatch may continue its caller.
      if (!dispatchedSignal || dispatchedSignal.aborted)
        throw new DOMException(
          "This current-session read was replaced.",
          "AbortError",
        );
      return value;
    });
}
