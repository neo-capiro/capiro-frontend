"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIdentity } from "../portfolio/auth/identity";
import {
  prepareClientEntry,
  prepareEntityEntry,
  clientEntryHref,
  type MeriEntityTarget,
} from "./descriptor";

type Target =
  | MeriEntityTarget
  | { source: "client-profile" | "command-palette" };

/** Reuse the same navigation owner for client and exact object references. Never sends. */
export function useEntryNavigation(
  clientId: string,
  active: boolean,
  target: Target,
) {
  const identity = useIdentity();
  const router = useRouter();
  const current =
    identity.isSuccess && !identity.isFetching && !identity.error
      ? identity.data
      : undefined;
  const scope = current?.tenant?.id
    ? { tenantId: current.tenant.id, actorId: current.user.id, clientId }
    : undefined;
  const key = JSON.stringify([scope, target]);
  const [failedKey, setFailedKey] = useState<string>();
  const ready = active && Boolean(scope);
  const noun =
    target.source === "client-profile" || target.source === "command-palette"
      ? "client"
      : "item";
  const reason =
    failedKey === key
      ? "The handoff could not be retained. Retry after resolving the current chat request."
      : !active
        ? `This ${noun} is not available for a client chat.`
        : ready
          ? `Open a draft with this ${noun} in context.`
          : "Your current account is unavailable.";
  return {
    ready,
    reason,
    open() {
      if (!ready || !scope) return;
      try {
        const entry =
          target.source === "workspace-draft" ||
          target.source === "planner-task"
            ? prepareEntityEntry(scope, target)
            : prepareClientEntry(
                scope,
                undefined,
                undefined,
                undefined,
                target.source,
              );
        router.push(clientEntryHref(entry));
      } catch {
        setFailedKey(key);
      }
    },
  };
}

export function useEntityEntry(
  clientId: string,
  target: MeriEntityTarget,
  active: boolean,
) {
  return useEntryNavigation(clientId, active, target);
}
