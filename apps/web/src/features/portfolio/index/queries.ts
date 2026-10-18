"use client";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useApi } from "@/shared/portfolio/api/provider";
import { clientSchema, ownersSchema, memberSchema } from "./contracts";
export { useClients, clientsKey } from "@/shared/portfolio/api/clients";
export const clientKey = (id: string) => ["portfolio", "client", id] as const;
export function useClient(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: clientKey(id),
    queryFn: ({ signal }) =>
      api.request("core", `clients/${encodeURIComponent(id)}`, clientSchema, {
        signal,
      }),
  });
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
