"use client";
import { useEntryNavigation } from "./useEntityEntry";

/** Navigation carries context only. Core checks access when the conversation is created or used. */
export function useClientEntry(
  clientId: string,
  active: boolean,
  source: "client-profile" | "command-palette" = "client-profile",
) {
  return useEntryNavigation(clientId, active, { source });
}
