"use client";
import { useLayoutEffect, useMemo, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { CapiroApiError } from "../../../../shared/capiro/http";
import { createRequestLifetime } from "../../../../shared/session/request-lifetime";

type Phase = "ready" | "pending" | "refused" | "unknown";
type State = { phase: Phase; message?: string };
type Send = <T>(request: () => Promise<T>) => Promise<T>;
function studioRequests(api: ReturnType<typeof useCapiro>) {
  let busy = false;
  let uncertain = false;
  return {
    ...createRequestLifetime(),
    api,
    begin() {
      if (busy || uncertain) return false;
      busy = true;
      return true;
    },
    finish(unknown: boolean) {
      busy = false;
      uncertain = unknown;
    },
  };
}

/** One mounted studio write lifetime survives selection, dialogs and refresh.
 * Reads can continue after a lost acknowledgement, but writes cannot replay. */
export function useStudioWrite() {
  const api = useCapiro();
  const scope = useMemo(() => studioRequests(api), [api]);
  useLayoutEffect(() => scope.mount(), [scope]);
  const [stored, setStored] = useState<{ scope: typeof scope; state: State }>({
    scope,
    state: { phase: "ready" },
  });
  const state =
    stored.scope === scope ? stored.state : { phase: "ready" as const };
  if (stored.scope !== scope) setStored({ scope, state: { phase: "ready" } });
  return {
    ...state,
    api,
    locked: state.phase === "pending" || state.phase === "unknown",
    async run(
      label: string,
      action: (send: Send, signal: AbortSignal) => Promise<void>,
    ) {
      if (!scope.begin()) return;
      const signal = scope.signal();
      let dispatched = false;
      let acknowledged = false;
      const set = (next: State) => {
        if (!signal.aborted) setStored({ scope, state: next });
      };
      set({ phase: "pending", message: `${label}…` });
      try {
        await action(async (request) => {
          if (signal.aborted)
            throw new DOMException("View changed", "AbortError");
          dispatched = true;
          const result = await request();
          acknowledged = true;
          return result;
        }, signal);
        if (signal.aborted) return;
        scope.finish(false);
        set({ phase: "ready", message: `${label} confirmed.` });
      } catch (error) {
        const knownRefusal =
          !acknowledged &&
          error instanceof CapiroApiError &&
          [400, 401, 403, 404, 409, 422].includes(error.status);
        const unknown = dispatched && !knownRefusal;
        scope.finish(unknown);
        set({
          phase: unknown ? "unknown" : "refused",
          message: unknown
            ? "The write could not be confirmed. Check the saved record before making further changes. Writes stay paused in this studio; refresh only reads."
            : error instanceof Error
              ? error.message
              : "The action was refused. Refresh the saved record and try again.",
        });
      }
    },
  };
}
export type StudioWrite = ReturnType<typeof useStudioWrite>;

/** Compare JSON values without treating object property order as content. */
export function sameStudioValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object")
    return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.entries(left),
    b = Object.entries(right);
  return (
    a.length === b.length &&
    a.every(
      ([key, value]) =>
        Object.hasOwn(right, key) &&
        sameStudioValue(value, (right as Record<string, unknown>)[key]),
    )
  );
}
