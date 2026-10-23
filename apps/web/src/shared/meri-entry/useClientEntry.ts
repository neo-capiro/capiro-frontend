"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIdentity } from "../portfolio/auth/identity";
import {
  prepareClientEntry,
  clientEntryHref,
  type MeriEntry,
} from "./descriptor";

/** Navigation carries context only. Core checks access when the conversation is created or used. */
export function useClientEntry(
  clientId: string,
  active: boolean,
  source: MeriEntry["source"] = "client-profile",
) {
  const identity = useIdentity();
  const router = useRouter();
  const [failure, setFailure] = useState(false);
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const scope = current?.tenant?.id
    ? { tenantId: current.tenant.id, actorId: current.user.id, clientId }
    : undefined;
  const ready = active && Boolean(scope);
  const reason = failure
    ? "The client handoff could not be retained. Retry after resolving the current chat request."
    : !active
      ? "This client is not active."
      : ready
        ? "Open a draft with this client in context."
        : "Your current account is unavailable.";
  return {
    ready,
    reason,
    open() {
      if (!ready || !scope) return;
      try {
        router.push(
          clientEntryHref(
            prepareClientEntry(scope, undefined, undefined, undefined, source),
          ),
        );
      } catch {
        setFailure(true);
      }
    },
  };
}
