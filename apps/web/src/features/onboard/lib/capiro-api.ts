import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useOnboardApi } from "@/shared/capiro/onboard-api";
import { importClientSelection } from "./import-client-selection";
export type {
  RegistrantHit,
  TenantRegistrant,
  ImportCandidate,
  ImportCandidatesResult,
  ImportResult,
  ImportChunkJobSummary,
  ImportJob,
  ImportJobCounts,
  ImportJobPage,
  ImportJobPopulation,
  ImportJobStatus,
  ImportJobStatusView,
  ImportJobItem,
  ImportItemCode,
  ImportItemOutcome,
  TeamInviteRole,
} from "@/shared/capiro/onboard-contracts";
export function useCapiroApi() {
  const { core } = useOnboardApi();
  return useMemo(
    () => ({
      ...core,
      importClients: (ids: number[]) =>
        importClientSelection(ids, core.importClientChunk),
    }),
    [core],
  );
}
export type CapiroApi = ReturnType<typeof useCapiroApi>;

/** billingAdmin drives the trial-cap upgrade CTA (onboarding "Super Admin" bit). */
export function useMe(options?: { enabled?: boolean }) {
  const api = useCapiroApi();
  const { isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["capiro", "me"],
    queryFn: () => api.me(),
    enabled: isLoaded && !!isSignedIn && (options?.enabled ?? true),
    retry: false,
    staleTime: 30_000,
  });
}
