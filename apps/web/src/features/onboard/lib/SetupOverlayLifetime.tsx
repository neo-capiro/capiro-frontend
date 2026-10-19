import { createContext, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createSetupOverlayLifetime,
  type SetupOverlayKind,
} from "./setup-overlay-lifetime";

type Lifetime = ReturnType<typeof createSetupOverlayLifetime>;
export const SetupOverlayLifetimeContext = createContext<Lifetime | null>(null);
const inactive = () => false;
const noSubscription = () => () => {};

/** The existing canonical cache owns current facts; this hook owns one editor opening. */
export function useSetupOverlay() {
  const cache = useQueryClient();
  const [lifetime, setLifetime] = useState<Lifetime | null>(null);
  const current = useSyncExternalStore(
    lifetime?.subscribe ?? noSubscription,
    lifetime?.current ?? inactive,
    inactive,
  );
  return {
    lifetime,
    overlay: current ? lifetime?.kind : null,
    open(kind: SetupOverlayKind) {
      lifetime?.close();
      const next = createSetupOverlayLifetime(cache, kind);
      setLifetime(next.current() ? next : null);
    },
    close() {
      lifetime?.close();
      setLifetime(null);
    },
  };
}
