"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { readRecovery } from "@/shared/session/recovery/journal";
import { profileKey } from "../profile-keys";
import {
  currentClientWriter,
  assertClientWriter,
  type ClientWriter,
} from "./authority";
import { runQuickLogUndo } from "./actions";
import {
  undoRecoveryContract,
  undoRecoveryScope,
  type UndoAttempt,
} from "./command-undo";

type Result = Awaited<ReturnType<typeof runQuickLogUndo>>;
type State = {
  scope: string;
  epoch: number;
  attempt: UndoAttempt | null;
  result?: Result["result"];
  error?: string;
};
/**
 * The scope is only a storage key, so an identity it cannot verify means "no
 * saved Undo" rather than a failure. `undoRecoveryScope` asserts UUID-shaped
 * ids and this runs during render, where a throw has no boundary above it and
 * blanks the whole Overview — so the render path must not let it escape.
 */
function renderUndoScope(actor: ClientWriter | undefined, clientId: string) {
  if (!actor) return undefined;
  try {
    return undoRecoveryScope(actor, clientId);
  } catch {
    return undefined;
  }
}
/** Mounted by QuickLog, independently of its dialog and transient result toast. */
export function useQuickLogUndo(clientId: string) {
  const api = useApi(),
    cache = useQueryClient();
  useIdentity();
  const actor = currentClientWriter(cache);
  const scope = renderUndoScope(actor, clientId);
  const [state, setState] = useState<State>();
  const [busy, setBusy] = useState(false);
  const [activation, setActivation] = useState({ scope, api, cache, epoch: 0 });
  if (
    activation.scope !== scope ||
    activation.api !== api ||
    activation.cache !== cache
  )
    setActivation({ scope, api, cache, epoch: activation.epoch + 1 });
  const epoch = activation.epoch;
  const lifetime = useRef<AbortController | null>(null);
  const operation = useRef<string | null>(null);
  const userId = actor?.userId,
    tenantId = actor?.tenantId;
  useLayoutEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    if (!scope || !userId || !tenantId) return () => controller.abort();
    const bound = { userId, tenantId };
    const guard = () => {
      controller.signal.throwIfAborted();
      assertClientWriter(cache, bound);
    };
    void (async () => {
      let attempt: UndoAttempt | null = null;
      try {
        attempt = await readRecovery(scope, undoRecoveryContract, guard);
        const result = attempt
          ? await runQuickLogUndo(
              api,
              bound,
              clientId,
              "read",
              controller.signal,
              guard,
            )
          : { attempt: null };
        guard();
        setState({ scope, epoch, ...result });
      } catch (cause) {
        if (!controller.signal.aborted)
          setState({
            scope,
            epoch,
            attempt,
            error:
              cause instanceof Error
                ? cause.message
                : "Undo recovery is unavailable.",
          });
      }
    })();
    return () => controller.abort();
  }, [api, cache, clientId, scope, userId, tenantId, epoch]);
  const current =
    state && state.scope === scope && state.epoch === epoch ? state : undefined;
  return {
    actor,
    attempt: current?.attempt,
    result: current && "result" in current ? current.result : undefined,
    error: current?.error,
    busy,
    ready: Boolean(scope && current && !busy),
    run: async (
      kind: "read" | "send" | "acknowledge",
      snapshot?: UndoAttempt["snapshot"],
    ) => {
      const controller = lifetime.current;
      if (!actor || !scope || !controller || operation.current) return false;
      const token = crypto.randomUUID();
      operation.current = token;
      setBusy(true);
      const guard = () => {
        controller.signal.throwIfAborted();
        assertClientWriter(cache, actor);
      };
      try {
        const result = await runQuickLogUndo(
          api,
          actor,
          clientId,
          kind,
          controller.signal,
          guard,
          snapshot,
        );
        guard();
        setState({ scope, epoch, ...result });
        return true;
      } catch (cause) {
        if (!controller.signal.aborted) {
          let attempt = current?.attempt ?? null;
          try {
            attempt = await readRecovery(scope, undoRecoveryContract, guard);
          } catch {
            /* Preserve the recovery hold. */
          }
          if (!controller.signal.aborted)
            setState({
              scope,
              epoch,
              attempt,
              error:
                cause instanceof Error
                  ? cause.message
                  : "Undo remains unconfirmed.",
            });
        }
        return false;
      } finally {
        if (operation.current === token) {
          operation.current = null;
          setBusy(false);
        }
        if (kind === "send")
          await cache.invalidateQueries({
            queryKey: profileKey(clientId, "activity"),
          });
      }
    },
  };
}
