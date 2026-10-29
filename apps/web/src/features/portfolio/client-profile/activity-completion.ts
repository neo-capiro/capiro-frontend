import type { QueryClient } from "@tanstack/react-query";
import {
  assertClientWriter,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import { profileKey } from "./profile-keys";

// A filtered-out row may refresh its same-actor feed, but a retired identity or
// replaced query cannot inherit completion work from that old mutation.
export function observeActivityCompletion(
  cache: QueryClient,
  clientId: string,
  actor: ClientWriter,
) {
  const queries = cache.getQueryCache();
  const queryKey = profileKey(clientId, "activity");
  const originalIdentity = queries.find({
    queryKey: ["identity"],
    exact: true,
  });
  const originalActivity = queries.find({ queryKey, exact: true });
  let current = Boolean(originalIdentity && originalActivity);
  function isCurrent() {
    if (!current) return false;
    if (
      queries.find({ queryKey: ["identity"], exact: true }) !==
        originalIdentity ||
      queries.find({ queryKey, exact: true }) !== originalActivity
    )
      current = false;
    try {
      assertClientWriter(cache, actor);
    } catch {
      current = false;
    }
    return current;
  }
  isCurrent();
  const unsubscribe = queries.subscribe((event) => {
    if (
      event.query.queryKey[0] === "identity" ||
      event.query === originalActivity
    )
      isCurrent();
  });
  return {
    async invalidate() {
      if (isCurrent())
        await Promise.all([
          cache.invalidateQueries({ queryKey, exact: true }),
          cache.invalidateQueries({ queryKey: [...queryKey, "metrics"] }),
        ]);
    },
    dispose() {
      current = false;
      unsubscribe();
    },
  };
}
