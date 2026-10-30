import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { CapiroApi } from "./capiro-api";
import type { ImportRequestScope } from "./import-request-intent";
import type {
  ImportJob,
  ImportJobPage,
} from "@/shared/capiro/onboard-contracts";
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
export function importJobsHistoryKey(scopeKey: string) {
  return [...importJobsRoot, scopeKey, "history"] as const;
}

/** Accumulated pages in server order, deduped by id without reordering. */
export function flattenImportJobPages(
  pages: readonly ImportJobPage[] | undefined,
): ImportJob[] {
  const seen = new Set<string>();
  const jobs: ImportJob[] = [];
  for (const page of pages ?? []) {
    for (const job of page.jobs) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      jobs.push(job);
    }
  }
  return jobs;
}

/** Explicit exhaustion: a null final cursor ends paging even after prior pages. */
export function importJobPageNextCursor(
  pages: readonly ImportJobPage[] | undefined,
): string | null {
  const last = pages?.at(-1);
  return last?.nextCursor ?? null;
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
  const failure = page.error ? classifyImportJobFailure(page.error) : null;
  const panelState = deriveImportJobPanelState({
    ready,
    loading: page.isLoading,
    failure,
    totalJobs: page.data?.population.total ?? 0,
  });
  // A refused/errored read must not surface any previously cached job content.
  const visible = ready && failure === null;
  return {
    scopeKey,
    ready,
    job: visible ? newestImportJob(page.data?.jobs ?? []) : null,
    population: visible ? page.data?.population : undefined,
    panelState,
    failure,
    refresh: () => page.refetch(),
  };
}

/** Shared infinite-query options: one page contract, explicit final null. */
export function importJobHistoryOptions(api: CapiroApi, scopeKey: string) {
  return {
    queryKey: importJobsHistoryKey(scopeKey),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api.getImportJobs({ limit: 20, cursor: pageParam ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ImportJobPage) => last.nextCursor ?? undefined,
  };
}

/** Refetch only reads bound to an admitted identity (refetch ignores enabled). */
export async function refreshImportJobReads(input: {
  history: { refetch: () => Promise<unknown> };
  request?: { refetch: () => Promise<unknown> } | null;
  detail?: { refetch: () => Promise<unknown> } | null;
  requestId?: string | null;
  jobId?: string | null;
}): Promise<void> {
  const reads: Promise<unknown>[] = [input.history.refetch()];
  if (input.requestId) reads.push(input.request!.refetch());
  if (input.jobId) reads.push(input.detail!.refetch());
  await Promise.all(reads);
}

/** Accumulated read-only history: pages, dedupe, explicit exhaustion, reset by scope. */
export function useImportJobHistory(
  api: CapiroApi,
  scopeKey: string,
  enabled: boolean,
) {
  return useInfiniteQuery({
    ...importJobHistoryOptions(api, scopeKey),
    enabled,
    retry: false,
    staleTime: 5_000,
  });
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
