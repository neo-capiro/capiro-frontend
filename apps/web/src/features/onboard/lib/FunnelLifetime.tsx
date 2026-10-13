import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFunnelLifetime } from "./funnel-lifetime";

export const FunnelLifetimeContext = createContext<ReturnType<
  typeof createFunnelLifetime
> | null>(null);

/** A new native session discards old editors; ordinary route remount keeps its journal. */
export function FunnelLifetime({
  sessionId,
  children,
}: {
  sessionId: string | null;
  children: ReactNode;
}) {
  const cache = useQueryClient();
  const lifetime = useMemo(
    () => createFunnelLifetime(cache, sessionId),
    [cache, sessionId],
  );
  useLayoutEffect(() => {
    lifetime.discardOtherSessions();
  }, [lifetime]);
  return (
    <FunnelLifetimeContext.Provider
      key={sessionId ?? "no-native-session"}
      value={lifetime}
    >
      {children}
    </FunnelLifetimeContext.Provider>
  );
}

export function useFunnelLifetime() {
  const lifetime = useContext(FunnelLifetimeContext);
  if (!lifetime) throw new Error("A current native funnel view is required.");
  return lifetime;
}
