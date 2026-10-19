import { useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** Non-sensitive draft/outcome evidence retained only in the canonical cache lifetime. */
export function useLocalOnboardRecord<T>(name: string) {
  const cache = useQueryClient();
  const key = useMemo(() => ["onboard", "local", name], [name]);
  cache.setQueryDefaults(key, { gcTime: Infinity });
  const value = useSyncExternalStore(
    (notify) => cache.getQueryCache().subscribe(notify),
    () => cache.getQueryData<T>(key),
    () => undefined,
  );
  return [value, (next: T) => cache.setQueryData(key, next)] as const;
}
