import type { QueryClient } from "@tanstack/react-query";
import type { FunnelSession } from "@/shared/capiro/onboard-contracts";
import { createOnboardAttempt } from "./attempt-journal";

export const FUNNEL_SESSION_KEY = ["funnel", "session"] as const;

/** Native session identity supplements (and never replaces) the root authority. */
export function createFunnelLifetime(
  cache: QueryClient,
  sessionId: string | null,
) {
  const key = ["onboard", "funnel", sessionId];
  const current = () => {
    const query = cache.getQueryState<FunnelSession | null>(FUNNEL_SESSION_KEY);
    if (query?.error || (query && query.fetchStatus !== "idle")) return false;
    if (sessionId !== null && query?.status !== "success") return false;
    return (query?.data?.sessionId ?? null) === sessionId;
  };
  return {
    sessionId,
    key,
    current,
    async read<T>(request: () => Promise<T>) {
      if (!current())
        throw new DOMException(
          "The native funnel session changed.",
          "AbortError",
        );
      const result = await request();
      if (!current())
        throw new DOMException(
          "The native funnel session changed.",
          "AbortError",
        );
      return result;
    },
    attempt: (name: string) => createOnboardAttempt(cache, name, current, key),
    discardOtherSessions: () =>
      cache.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === "onboard" &&
          query.queryKey[1] === "funnel" &&
          query.queryKey[2] !== sessionId,
      }),
  };
}
