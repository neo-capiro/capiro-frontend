import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import type { CapiroApi } from "./capiro-api";
import type { ImportRequestScope } from "./import-request-intent";
import { CapiroApiError } from "@/shared/capiro/http";
import {
  deriveImportJobPanelState,
  newestImportJob,
} from "./import-job-status";

export type ImportJobReadFailure = "unavailable" | "error";

export const importJobsRoot = ["capiro", "import-jobs"] as const;

export function importJobsPageKey(scopeKey: string, cursor?: string) {
  return [...importJobsRoot, scopeKey, "page", cursor ?? "first"] as const;
}
export function importJobsRequestKey(scopeKey: string, requestId: string) {
  return [...importJobsRoot, scopeKey, "request", requestId] as const;
}
export function importJobDetailKey(scopeKey: string, jobId: string) {
  return [...importJobsRoot, scopeKey, "job", jobId] as const;
}

/** Revoked membership, hidden job and expired session are all "not available". */
export function classifyImportJobFailure(error: unknown): ImportJobReadFailure {
  if (
    error instanceof CapiroApiError &&
    (error.status === 401 || error.status === 403 || error.status === 404)
  )
    return "unavailable";
  return "error";
}

/** Clerk org+user identity the reads/actions are bound to. Never authority. */
export function useImportAccountScope(): {
  scope: ImportRequestScope | null;
  scopeKey: string;
  ready: boolean;
} {
  const { isLoaded, isSignedIn, orgId, userId } = useAuth();
  const ready = isLoaded && !!isSignedIn && !!userId;
  const scope = ready ? { orgId: orgId ?? null, userId: userId! } : null;
  return {
    scope,
    scopeKey: `${scope?.orgId ?? "no-org"}:${scope?.userId ?? "anonymous"}`,
    ready,
  };
}

/** Compact latest-job read for the setup dashboard card (same account-bound key). */
export function useLatestImportJob(api: CapiroApi) {
  const { scopeKey, ready } = useImportAccountScope();
  const page = useImportJobPage(api, scopeKey, ready);
  const newest = newestImportJob(page.data?.jobs ?? []);
  const failure = page.error ? classifyImportJobFailure(page.error) : null;
  const panelState = deriveImportJobPanelState({
    ready,
    loading: page.isLoading,
    failure,
    totalJobs: page.data?.population.total ?? 0,
  });
  return {
    scopeKey,
    ready,
    job: newest,
    population: page.data?.population,
    panelState,
    failure,
    refresh: () => page.refetch(),
  };
}

export function useImportJobPage(
  api: CapiroApi,
  scopeKey: string,
  enabled: boolean,
  cursor?: string,
) {
  return useQuery({
    queryKey: importJobsPageKey(scopeKey, cursor),
    queryFn: () => api.getImportJobs({ limit: 20, cursor }),
    enabled,
    retry: false,
    staleTime: 5_000,
  });
}

export function useImportJobByRequest(
  api: CapiroApi,
  scopeKey: string,
  requestId: string | null,
) {
  return useQuery({
    queryKey: importJobsRequestKey(scopeKey, requestId ?? "none"),
    queryFn: () => api.getImportJobs({ requestId: requestId!, limit: 1 }),
    enabled: !!requestId,
    retry: false,
    staleTime: 0,
  });
}

export function useImportJobDetail(
  api: CapiroApi,
  scopeKey: string,
  jobId: string | null,
) {
  return useQuery({
    queryKey: importJobDetailKey(scopeKey, jobId ?? "none"),
    queryFn: () => api.getImportJob(jobId!),
    enabled: !!jobId,
    retry: false,
    staleTime: 0,
  });
}
