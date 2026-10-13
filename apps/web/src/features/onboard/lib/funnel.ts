import {
  funnelSessionQuery,
  refreshFunnelSession,
} from "./funnel-session-read";
export { refreshFunnelSession } from "./funnel-session-read";
export { FUNNEL_SESSION_KEY } from "./funnel-lifetime";
import type { AttemptGuard } from "./attempt-journal";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOnboardApi } from "@/shared/capiro/onboard-api";
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
    ...funnelSessionQuery(api.getSession),
    enabled: isLoaded && !!isSignedIn && (options?.enabled ?? true),
  });
}

/** Only a current server session can advance the displayed funnel. */
export function useAdvanceSession() {
  const queryClient = useQueryClient();
  const api = useFunnelApi();
  return async (guard: AttemptGuard) => {
    const current = await guard.wait(() =>
      refreshFunnelSession(queryClient, api.getSession),
    );
    if (!current) throw new Error("No current funnel registration was found.");
    return current;
  };
}
