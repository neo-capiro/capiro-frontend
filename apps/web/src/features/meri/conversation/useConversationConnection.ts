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

/** A naturally expired session renews once on its own; a quick loss needs an explicit reconnect. */
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

/**
 * Owns the short-lived opaque session for the conversation's current run. A finished run is never
 * reopened for input: the next prompt opens a new session for the same conversation and the
 * service binds its successor run (or refuses). Reopening the same run uses its exact selectors.
 */
export function useConversationConnection(
  account: ConversationAccount,
  clientId: string,
  now: () => number = Date.now,
) {
  const cache = useQueryClient();
  const [selection] = useState(() =>
    conversationSelectionOwner(cache, account, clientId),
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
    (options: { nextTurn?: boolean; pending?: string } = {}) => {
      const context = bound.last()?.context;
      const hints = !context
        ? selection.hints
        : options.nextTurn
          ? selection.nextTurnHints(context.conversationId)
          : {
              clientId,
              conversationId: context.conversationId,
              runId: context.runId,
            };
      setOpening({
        host: create(hints),
        hints,
        ...(options.pending ? { pending: options.pending } : {}),
      });
    },
    [clientId, create, selection, bound],
  );

  const renewed = useRef<string | null>(null);
  useEffect(() => {
    const last = bound.last();
    if (state.status !== "expired" || !last) return;
    const key = JSON.stringify(last.context) + last.at;
    if (renewed.current === key || now() - last.at < renewAfterMs) return;
    renewed.current = key;
    reopen();
  }, [state.status, reopen, bound, now]);

  return {
    state,
    pending: opening.pending,
    /** Reopen the same run after expiry; otherwise retry the same selectors, never broader ones. */
    retry: () =>
      state.status === "expired"
        ? reopen(opening.pending ? { pending: opening.pending } : {})
        : setOpening({ ...opening, host: create(opening.hints) }),
    reopen,
  };
}
