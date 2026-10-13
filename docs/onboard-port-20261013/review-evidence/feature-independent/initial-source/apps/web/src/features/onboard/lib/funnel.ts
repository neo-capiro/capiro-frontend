import { FUNNEL_SESSION_KEY } from "./funnel-lifetime";
export { FUNNEL_SESSION_KEY } from "./funnel-lifetime";
import type { AttemptGuard } from "./attempt-journal";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOnboardApi } from "@/shared/capiro/onboard-api";
import { CapiroApiError as OnboardApiError } from "@/shared/capiro/http";
import type { FunnelSession } from "@/shared/capiro/onboard-contracts";
export { CapiroApiError as OnboardApiError } from "@/shared/capiro/http";
export type {
  FunnelState,
  FunnelSession,
  PlanChoice,
  PayMethod,
  RoleMode,
  ImportMode,
  RoleDesignation,
  OrgProfile,
  LegalDoc,
  FunnelStatus,
} from "@/shared/capiro/onboard-contracts";
export * from "./registration-draft";
export * from "./dates";
export function useFunnelApi() {
  return useOnboardApi().funnel;
}
export type FunnelApi = ReturnType<typeof useFunnelApi>;

// ── Session hook + cache helpers ────────────────────────────────────────────

export function useFunnelSession(options?: { enabled?: boolean }) {
  const api = useFunnelApi();
  const { isLoaded, isSignedIn } = useAuth();
  return useQuery<FunnelSession | null>({
    queryKey: FUNNEL_SESSION_KEY,
    // "Not registered yet" (404) is a NORMAL state — a signed-in user who
    // hasn't POSTed /funnel/register. Resolve it to a stable `null` SUCCESS
    // instead of an error: an errored query is always considered stale, so
    // react-query re-fetches it on every observer mount, and the funnel's
    // guard/verify remount churn turned that into a ~20 req/s loop that never
    // settled (guard stuck on isLoading → VerifyPage never mounted → its
    // recovery redirect never ran). A fresh `null` success settles isLoading
    // and honours staleTime, so consumers route deterministically.
    queryFn: async () => {
      try {
        return await api.getSession();
      } catch (err) {
        if (err instanceof OnboardApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: isLoaded && !!isSignedIn && (options?.enabled ?? true),
    retry: false,
    staleTime: 5_000,
  });
}

/** Only a current server session can advance the displayed funnel. */
export function useAdvanceSession() {
  const queryClient = useQueryClient();
  const api = useFunnelApi();
  return async (guard: AttemptGuard) => {
    const current = await guard.wait(() => api.getSession());
    queryClient.setQueryData(FUNNEL_SESSION_KEY, current);
    guard.assertCurrent();
    return current;
  };
}
