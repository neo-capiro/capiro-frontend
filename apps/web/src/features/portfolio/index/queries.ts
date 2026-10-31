"use client";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { ownersSchema, memberSchema } from "./contracts";
export { useClients, clientsKey } from "@/shared/portfolio/api/clients";
// The client-detail read lives in ONE neutral module so the catalogue and the profile
// panels share a cache entry (and an actor scope) instead of issuing the same GET twice.
export { clientKey, clientReadKey, useClientRead } from "../clients/public";
import { useClientRead } from "../clients/public";
export function useClient(id: string) {
  return useClientRead(id);
}
export function useAccountOwners(options?: { enabled?: boolean }) {
  const api = useApi();
  return useQuery({
    queryKey: ["account-owners"],
    enabled: options?.enabled !== false,
    queryFn: ({ signal }) =>
      api.request("core", "client-account-owners", ownersSchema, { signal }),
  });
}
export function useMemberOptions(options?: { enabled?: boolean }) {
  const api = useApi();
  return useQuery({
    queryKey: ["member-options"],
    enabled: options?.enabled !== false,
    queryFn: ({ signal }) =>
      api.request(
        "core",
        "client-account-owners/options",
        z.array(memberSchema),
        { signal },
      ),
  });
}
