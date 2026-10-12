import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { ApiError } from "@/shared/portfolio/api/http";
export type ProfileSource = { key: QueryKey; revision: number };
export function currentProfileSource(
  cache: QueryClient,
  key: QueryKey,
): ProfileSource | undefined {
  const state = cache.getQueryState(key);
  if (
    state?.status === "success" &&
    !state.error &&
    !state.isInvalidated &&
    state.fetchStatus === "idle"
  )
    return { key, revision: state.dataUpdateCount };
}
export function profileSourceMatches(
  cache: QueryClient,
  source: ProfileSource,
) {
  return currentProfileSource(cache, source.key)?.revision === source.revision;
}
export function assertProfileSource(cache: QueryClient, source: ProfileSource) {
  if (!profileSourceMatches(cache, source))
    throw new ApiError(
      409,
      "Saved profile data changed or is unavailable. Refresh it before saving.",
    );
}
