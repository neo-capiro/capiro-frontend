import { FunnelLifetimeContext } from "./FunnelLifetime";
import {
  useContext,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createOnboardAttempt } from "./attempt-journal";

/** The journal lives only in the root-owned QueryClient/authority lifetime. */
export function useOnboardAttempt(owner: object, name: string) {
  const cache = useQueryClient();
  const funnel = useContext(FunnelLifetimeContext);
  const attempt = useMemo(() => {
    // Owner identity changes create a new view lifetime; layout cleanup fences
    // the previous controller without reading or mutating refs during render.
    void owner;
    return (
      funnel?.attempt(name) ?? createOnboardAttempt(cache, name, () => true)
    );
  }, [cache, owner, name, funnel]);
  useLayoutEffect(() => attempt.mount(), [attempt]);
  const record = useSyncExternalStore(
    (notify) => cache.getQueryCache().subscribe(notify),
    attempt.read,
    () => undefined,
  );
  return {
    ...attempt,
    record,
    pending: record?.phase === "pending",
    locked: attempt.blocked(),
  };
}
