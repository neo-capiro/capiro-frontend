import type { QueryClient } from "@tanstack/react-query";
import type { SetupState } from "@/shared/capiro/onboard-contracts";
import { SETUP_STATE_KEY } from "./setup-overlay-lifetime";
import { refreshCurrentQuery } from "./current-query-read";

export function refreshSetupState(
  cache: QueryClient,
  request: () => Promise<SetupState>,
) {
  return refreshCurrentQuery(cache, SETUP_STATE_KEY, request);
}

/** A mounted setup owner cannot regain admission after a failed current read. */
export function createSetupReadLifetime(cache: QueryClient) {
  let revoked = false;
  const current = () => {
    const query = cache.getQueryState<SetupState>(SETUP_STATE_KEY);
    if (
      !query ||
      query.status !== "success" ||
      query.error ||
      !query.data ||
      query.data.legacyTenant
    )
      revoked = true;
    return !revoked && query?.fetchStatus === "idle";
  };
  return {
    current,
    subscribe: () =>
      cache.getQueryCache().subscribe(() => {
        current();
      }),
  };
}
