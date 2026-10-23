"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useIdentity } from "../portfolio/auth/identity";
import { useCapiro } from "../capiro/CapiroBoundary";
import {
  firstChatCapabilityOperationKey,
  requireFirstChatCapability,
} from "../capiro/operations/meri-first-chat";
import {
  prepareClientEntry,
  clientEntryHref,
  type MeriEntry,
} from "./descriptor";

/** A fresh capability enables navigation; Core bootstrap still owns admission. */
export function useClientEntry(
  clientId: string,
  active: boolean,
  source: MeriEntry["source"] = "client-profile",
) {
  const identity = useIdentity();
  const api = useCapiro();
  const router = useRouter();
  const [failure, setFailure] = useState(false);
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const scope = current?.tenant?.id
    ? { tenantId: current.tenant.id, actorId: current.user.id, clientId }
    : undefined;
  const capability = useQuery({
    queryKey: [
      "meri-entry-capability",
      scope?.tenantId,
      scope?.actorId,
      clientId,
    ],
    enabled: active && Boolean(scope),
    staleTime: 0,
    retry: false,
    refetchInterval: 20_000,
    queryFn: async ({ signal }) => {
      if (!scope) throw new Error("Current account unavailable");
      const value = await api.request(
        firstChatCapabilityOperationKey,
        { body: { schemaVersion: 1, clientId } },
        { signal },
      );
      return requireFirstChatCapability(value, scope);
    },
  });
  let ready = false;
  try {
    if (
      active &&
      scope &&
      capability.isSuccess &&
      !capability.isFetching &&
      !capability.error
    )
      ready = Boolean(requireFirstChatCapability(capability.data, scope));
  } catch {
    /* expired hints stay disabled */
  }
  const reason = failure
    ? "The client handoff could not be retained. Retry after resolving the current chat request."
    : !active
      ? "This client is not active."
      : capability.isFetching
        ? "Checking current conversation access."
        : ready
          ? "Open Meri with this client in context."
          : "Client conversations are not available in this environment.";
  return {
    ready,
    reason,
    open() {
      if (!ready || !scope) return;
      try {
        router.push(
          clientEntryHref(
            prepareClientEntry(
              scope,
              capability.data,
              undefined,
              undefined,
              undefined,
              source,
            ),
          ),
        );
      } catch {
        setFailure(true);
      }
    },
  };
}
