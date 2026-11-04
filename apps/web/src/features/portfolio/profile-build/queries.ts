"use client";
import {
  sameSubject,
  profileBuildKey,
  profileBuildPath,
  type ProfileSubject,
} from "./subject";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { canAdminister, useIdentity } from "@/shared/portfolio/auth/identity";
import { runSchema, setupSchema, type ProfileBuildRun } from "./contracts";
import { reviewSnapshotSchema } from "./review-contracts";
export { profileBuildKey, profileBuildPath } from "./subject";
export const isProfileAccessDenied = (error: unknown): error is ApiError =>
  error instanceof ApiError && [401, 403, 404].includes(error.status);
export async function resetDeniedProfileReads(
  cache: QueryClient,
  subject: ProfileSubject,
  error: unknown,
) {
  if (isProfileAccessDenied(error))
    await cache.resetQueries({ queryKey: profileBuildKey(subject) });
}

export const latestReviewKey = (
  subject: ProfileSubject,
  actor: { tenantId: string | undefined; userId: string | undefined },
) =>
  [
    ...profileBuildKey(subject),
    "latest",
    actor.tenantId,
    actor.userId,
  ] as const;
export const setupKey = (
  subject: ProfileSubject,
  actor: { tenantId: string | undefined; userId: string | undefined },
) =>
  [...profileBuildKey(subject), "setup", actor.tenantId, actor.userId] as const;
export async function loadRun(
  api: ApiClient,
  subject: ProfileSubject,
  runId: string,
  signal?: AbortSignal,
) {
  const run = await api.request(
    "core",
    `${profileBuildPath(subject)}/runs/${encodeURIComponent(runId)}`,
    runSchema,
    { signal },
  );
  if (!sameSubject(run.subject, subject) || run.id !== runId)
    throw new ApiError(502, "The review returned a different client or run.");
  return attachReview(api, subject, run, signal);
}
async function attachReview(
  api: ApiClient,
  subject: ProfileSubject,
  run: ProfileBuildRun,
  signal?: AbortSignal,
): Promise<ProfileBuildRun> {
  signal?.throwIfAborted();
  const review = await api.request(
    "core",
    `${profileBuildPath(subject)}/runs/${run.id}/review`,
    reviewSnapshotSchema.refine(
      (value) => sameSubject(value.subject, subject) && value.runId === run.id,
    ),
    { signal },
  );
  return {
    ...run,
    clientRevision: review.clientRevision,
    findings: review.findings,
  };
}
export function useProfileBuildAccess() {
  const identity = useIdentity();
  const ready =
    !identity.isPending &&
    !identity.isFetching &&
    !identity.isPaused &&
    !identity.error &&
    Boolean(identity.data?.user.id.trim()) &&
    Boolean(identity.data?.tenant?.id.trim());
  return {
    identity,
    canRead:
      ready &&
      (identity.data?.role === "standard_user" ||
        canAdminister(identity.data?.role)),
    canEdit: ready && canAdminister(identity.data?.role),
  };
}
export function useLatestReview(subject: ProfileSubject, enabled: boolean) {
  const api = useApi();
  const { identity, canRead } = useProfileBuildAccess();
  const query = useQuery({
    queryKey: latestReviewKey(subject, {
      tenantId: identity.data?.tenant?.id,
      userId: identity.data?.user.id,
    }),
    enabled: enabled && canRead,
    retry: false,
    queryFn: async ({ signal }) => {
      const run = await api.request(
        "core",
        `${profileBuildPath(subject)}/latest`,
        runSchema.nullable(),
        { signal },
      );
      if (run && !sameSubject(run.subject, subject))
        throw new ApiError(502, "The review returned a different client.");
      return run ? attachReview(api, subject, run, signal) : null;
    },
    refetchInterval: (q) =>
      !q.state.error && q.state.data?.status === "running" ? 2000 : false,
  });
  return {
    ...query,
    data: canRead && query.isSuccess && !query.error ? query.data : undefined,
  };
}
export function useProfileBuildSetup(
  subject: ProfileSubject,
  enabled: boolean,
) {
  const api = useApi();
  const { identity, canRead } = useProfileBuildAccess();
  const query = useQuery({
    queryKey: setupKey(subject, {
      tenantId: identity.data?.tenant?.id,
      userId: identity.data?.user.id,
    }),
    enabled: enabled && canRead,
    retry: false,
    queryFn: ({ signal }) =>
      api.request(
        "core",
        `${profileBuildPath(subject)}/setup`,
        setupSchema.refine((s) => sameSubject(s.subject, subject)),
        { signal },
      ),
  });
  return {
    ...query,
    data: canRead && query.isSuccess && !query.error ? query.data : undefined,
  };
}
