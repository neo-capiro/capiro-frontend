"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CapiroCapabilities } from "./config";

/**
 * Cohort capabilities resolved on the server and handed to the client once.
 *
 * The default is deliberately the conservative "unknown" contract rather than an optimistic or
 * disabled guess: a client that is mounted without the provider (tests, isolated screens) keeps the
 * current accepted behaviour instead of silently claiming a feature is unavailable.
 */
export const UNKNOWN_CAPABILITIES: CapiroCapabilities = {
  campaignSessions: "unknown",
};
const CapabilitiesContext = createContext<CapiroCapabilities>(UNKNOWN_CAPABILITIES);

export function CapiroCapabilitiesProvider({
  capabilities,
  children,
}: {
  capabilities: CapiroCapabilities;
  children: ReactNode;
}) {
  return (
    <CapabilitiesContext.Provider value={capabilities}>
      {children}
    </CapabilitiesContext.Provider>
  );
}

export function useCapiroCapabilities(): CapiroCapabilities {
  return useContext(CapabilitiesContext);
}
