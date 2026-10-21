"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ConversationHostController,
  type ConversationAccount,
} from "../../../shared/meri-conversations/host-controller";
import { conversationSelectionOwner } from "../../../shared/meri-conversations/query-journal";
import type { ActionContext } from "../../../shared/meri-actions/session-receipt";

/** A short hard expiry needs explicit reconnect; proactive renewal already has timer evidence. */
const renewAfterMs = 60_000;
type Hints = ConstructorParameters<
  typeof ConversationHostController
>[0]["hints"];
type Opening = Readonly<{
  host: ConversationHostController;
  hints: Hints;
  /** A prompt the person sent that waits for this fresh run's session. */
  pending?: string;
}>;
type Reopening = {
  target?: { conversationId: string; runId: string };
  pending?: string;
};
const exactTarget = (hints: Hints | ActionContext | undefined) =>
  hints?.conversationId && hints.runId
    ? { conversationId: hints.conversationId, runId: hints.runId }
    : undefined;

/** The last context the service bound, kept for exact reopening; never read to render. */
function boundContext() {
  let last: Readonly<{ context: ActionContext; at: number }> | null = null;
  return {
    record(context: ActionContext, at: number) {
      last = Object.freeze({ context, at });
    },
    last: () => last,
  };
}

/** Renewal and access loss share the last exact binding, but a denial never renews itself. */
function useSessionRenewal({
  host,
  status,
  bound,
  reopen,
  now,
}: {
  host: ConversationHostController;
  status: ReturnType<ConversationHostController["getSnapshot"]>["status"];
  bound: ReturnType<typeof boundContext>;
  reopen: (options?: Reopening) => void;
  now: () => number;
}) {
  // Keep private data hidden through explicit retry until a fresh receipt is validated.
  const [denied, setDenied] = useState(false);
  const revoked = host.getExpirationReason() === "access-lost";
  if (revoked && !denied) setDenied(true);
  else if (status === "ready" && denied) setDenied(false);
  const accessLost = revoked || (denied && status !== "ready");

  const renewed = useRef<string | null>(null);
  useEffect(() => {
    const last = bound.last();
    if (status !== "expired" || !last) return;
    const reason = host.getExpirationReason();
    if (reason === "access-lost") return;
    const key = JSON.stringify(last.context) + last.at;
    if (
      renewed.current === key ||
      (reason !== "renewal" && now() - last.at < renewAfterMs)
    )
      return;
    renewed.current = key;
    reopen();
  }, [status, reopen, bound, now, host]);

  return {
    accessLost,
    revoke: useCallback(() => {
      const last = bound.last();
      if (last) renewed.current = JSON.stringify(last.context) + last.at;
      host.revoke();
    }, [host, bound]),
  };
}

/**
 * Owns a short-lived opaque session. New-turn admission supplies an exact target; neither
 * reconnect nor session issuance is allowed to select a broader successor on its own.
 */
export function useConversationConnection(
  account: ConversationAccount,
  clientId: string,
  now: () => number = Date.now,
  conversationId?: string,
) {
  const cache = useQueryClient();
  const [selection] = useState(() =>
    conversationSelectionOwner(cache, account, clientId, conversationId),
  );
  const [bound] = useState(boundContext);
  const create = useCallback(
    (hints: Hints) =>
      new ConversationHostController({
        account,
        hints,
        onBound: (context) => {
          selection.record(context);
          bound.record(context, now());
        },
      }),
    [account, selection, bound, now],
  );
  const [opening, setOpening] = useState<Opening>(() => ({
    host: create(selection.hints),
    hints: selection.hints,
  }));
  const { host } = opening;
  useLayoutEffect(() => {
    host.setClientAvailable(true);
    return () => host.setClientAvailable(false);
  }, [host]);
  useEffect(() => {
    const detach = host.attach();
    void host.connect();
    return detach;
  }, [host]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );

  const reopen = useCallback(
    (options: Reopening = {}) => {
      const target = options.target ?? exactTarget(bound.last()?.context);
      const hints = target
        ? {
            clientId,
            conversationId: target.conversationId,
            runId: target.runId,
          }
        : selection.hints;
      setOpening({
        host: create(hints),
        hints,
        ...(options.pending ? { pending: options.pending } : {}),
      });
    },
    [clientId, create, selection, bound],
  );

  const renewal = useSessionRenewal({
    host,
    status: state.status,
    bound,
    reopen,
    now,
  });

  return {
    state,
    ...renewal,
    conversationId: opening.hints.conversationId,
    pending: opening.pending,
    /** Reopen the same run after expiry; otherwise retry the same selectors, never broader ones. */
    retry: () =>
      state.status === "expired"
        ? reopen({
            target: exactTarget(opening.hints),
            pending: opening.pending,
          })
        : setOpening({ ...opening, host: create(opening.hints) }),
    reopen,
  };
}
