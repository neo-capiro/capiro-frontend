"use client";
import { useLayoutEffect, useRef, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { ApiClient } from "@/shared/portfolio/api/http";
import { readRecovery } from "@/shared/session/recovery/journal";
import { assertClientWriter, type ClientWriter } from "./authority";
import {
  recoveryScope,
  retainedCommandContract,
  verifyCommandAuthority,
  type RetainedCommand,
} from "./command-recovery";

type RecoveryState = {
  scope: string;
  token: string;
  status: "checking" | "ready" | "blocked";
  error?: string;
};
export function useCommandRecovery(
  api: ApiClient,
  cache: QueryClient,
  actor: ClientWriter | undefined,
  clientId: string,
  open: boolean,
  install: (record: RetainedCommand | null) => void,
) {
  let scope: string | undefined;
  try {
    if (actor) scope = recoveryScope(actor, clientId);
  } catch {
    /* Ordinary legacy logging remains available; durable commands require Core UUIDs. */
  }
  const [state, setState] = useState<RecoveryState>();
  const [revision, setRevision] = useState(0);
  // Reopening a mounted dialog is a new authority check, even when its scope
  // matches a former ready state. Invalidate during render before fields commit.
  const [activation, setActivation] = useState({
    scope,
    open,
    api,
    cache,
    epoch: 0,
  });
  if (
    activation.scope !== scope ||
    activation.open !== open ||
    activation.api !== api ||
    activation.cache !== cache
  )
    setActivation({ scope, open, api, cache, epoch: activation.epoch + 1 });
  const installRef = useRef(install);
  useLayoutEffect(() => {
    installRef.current = install;
  }, [install]);
  const token = JSON.stringify([scope, open, revision, activation.epoch]);
  const actorUserId = actor?.userId,
    tenantId = actor?.tenantId;
  useLayoutEffect(() => {
    if (!open || !scope || !actorUserId || !tenantId) return;
    const controller = new AbortController();
    const bound = { userId: actorUserId, tenantId };
    const guard = () => {
      controller.signal.throwIfAborted();
      assertClientWriter(cache, bound);
    };
    void (async () => {
      try {
        await verifyCommandAuthority(
          api,
          bound,
          clientId,
          controller.signal,
          guard,
        );
        const record = await readRecovery(
          scope,
          retainedCommandContract,
          guard,
        );
        guard();
        installRef.current(record);
        setState({ scope, token, status: "ready" });
      } catch (cause) {
        if (!controller.signal.aborted)
          setState({
            scope,
            token,
            status: "blocked",
            error:
              cause instanceof Error
                ? cause.message
                : "Saved-command recovery is unavailable.",
          });
      }
    })();
    return () => controller.abort();
  }, [
    api,
    cache,
    scope,
    actorUserId,
    tenantId,
    clientId,
    open,
    revision,
    token,
  ]);
  const current =
    state && state.scope === scope && state.token === token ? state : undefined;
  return {
    scope,
    ready: Boolean(scope && open && current?.status === "ready"),
    checking: Boolean(
      scope && open && (!current || current.status === "checking"),
    ),
    blocked: Boolean(scope && open && current?.status === "blocked"),
    error: current?.error,
    retry: () => setRevision((value) => value + 1),
    block: (error: string) => {
      if (scope) setState({ scope, token, status: "blocked", error });
    },
  };
}
