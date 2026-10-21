"use client";
import { createContext, useContext } from "react";
import { heldMeriCapabilities, type MeriCapabilities } from "./capabilities";

const Context = createContext<MeriCapabilities | null>(null);

/** Server-decided presentation state only; no credential or authority is included. */
export function MeriCapabilitiesProvider({
  value,
  children,
}: {
  value: MeriCapabilities;
  children?: React.ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useMeriCapabilities() {
  return useContext(Context) ?? heldMeriCapabilities;
}
