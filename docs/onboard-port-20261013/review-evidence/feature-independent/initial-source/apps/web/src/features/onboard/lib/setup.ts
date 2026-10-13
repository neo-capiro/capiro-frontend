import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useOnboardApi } from "@/shared/capiro/onboard-api";
export { CapiroApiError as ApiError } from "@/shared/capiro/http";
export type {
  SetupTaskKey,
  SetupTaskStatus,
  SetupItInvite,
  SetupState,
  ItInviteView,
} from "@/shared/capiro/onboard-contracts";
export function useSetupApi() {
  return useOnboardApi().setup;
}
export type SetupApi = ReturnType<typeof useSetupApi>;
export function useItApi() {
  return useOnboardApi().it;
}

// ── State hook ──────────────────────────────────────────────────────────────

export const SETUP_STATE_KEY = ["setup", "state"] as const;

/**
 * The dashboard's source of truth. Polls every 5s while the IT-email task is
 * 'waiting' — the org-wide grant lands from the IT admin's browser, not ours.
 */
export function useSetupState(options?: { enabled?: boolean }) {
  const api = useSetupApi();
  const { isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: SETUP_STATE_KEY,
    queryFn: () => api.getState(),
    enabled: isLoaded && !!isSignedIn && (options?.enabled ?? true),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.tasks.it_email === "waiting" ? 5_000 : false,
  });
}
