"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { clientSchema } from "../../session/client-contract";
import { useApi } from "./provider";

export const clientsKey = ["portfolio", "clients"] as const;

/** Shared roster read; Core remains the authority for visible client membership. */
export function useClients(options?: {
  enabled?: boolean;
  scope?: { tenantId: string; userId: string };
}) {
  const api = useApi();
  const scope = options?.scope;
  return useQuery({
    queryKey: scope
      ? [...clientsKey, scope.tenantId, scope.userId]
      : clientsKey,
    enabled:
      options?.enabled !== false &&
      (!scope || Boolean(scope.tenantId && scope.userId)),
    queryFn: ({ signal }) =>
      api.request("core", "clients", z.array(clientSchema), { signal }),
  });
}
