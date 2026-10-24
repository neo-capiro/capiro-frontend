"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ConversationHostController,
  type ConversationAccount,
} from "../../../shared/meri-conversations/host-controller";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import { useConversationSelection } from "./useConversationSelection";

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
const exactTarget = (hints: Hints | ConversationContext | undefined) =>
  hints?.conversationId && hints.runId
    ? { conversationId: hints.conversationId, runId: hints.runId }
    : undefined;

/** Last service binding: an exact reopening/draft selector, never current authority. */
function boundContext() {
  let last: Readonly<{ context: ConversationContext; at: number }> | null =
    null;
  return {
    record(context: ConversationContext, at: number) {
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

/** Exact selectors and explicit opening intent stay separate from mounted host/renewal resources. */
function useConversationOpening(
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string | undefined,
  now: () => number,
  bound: ReturnType<typeof boundContext>,
  retention: Pick<
    ReturnType<typeof useConversationSelection>,
    "selection" | "storageError" | "record"
  >,
) {
  const { selection, storageError, record } = retention;
  const create = useCallback(
    (hints: Hints) =>
      new ConversationHostController({
        account,
        hints,
        onBound: (context) => {
          record(context);
          bound.record(context, now());
        },
      }),
    [account, record, bound, now],
  );
  const [opening, setOpening] = useState<Opening>(() => ({
    host: create(
      selection?.hints ?? {
        clientId,
        ...(conversationId ? { conversationId } : {}),
      },
    ),
    hints: selection?.hints ?? {
      clientId,
      ...(conversationId ? { conversationId } : {}),
    },
  }));
  const reopen = useCallback(
    (options: Reopening = {}) => {
      if (!selection || storageError) return;
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
    [clientId, create, selection, bound, storageError],
  );

  return {
    opening,
    reopen,
    retry: (status: string) =>
      status === "expired"
        ? reopen({
            target: exactTarget(opening.hints),
            pending: opening.pending,
          })
        : setOpening({ ...opening, host: create(opening.hints) }),
  };
}

/**
 * Owns a short-lived opaque session. New-turn admission supplies an exact target; neither
 * reconnect nor session issuance is allowed to select a broader successor on its own.
 */
export function useConversationConnection(
  account: ConversationAccount,
  clientId: string | null,
  now: () => number = Date.now,
  conversationId?: string,
) {
  const { selection, storageError, record, clear } = useConversationSelection(
    account,
    clientId,
    conversationId,
  );
  const [bound] = useState(boundContext);
  const { opening, reopen, retry } = useConversationOpening(
    account,
    clientId,
    conversationId,
    now,
    bound,
    { selection, storageError, record },
  );
  const { host } = opening;
  useLayoutEffect(() => {
    host.setClientAvailable(!storageError);
    return () => host.setClientAvailable(false);
  }, [host, storageError]);
  useEffect(() => {
    if (storageError) return;
    const detach = host.attach();
    void host.connect();
    return detach;
  }, [host, storageError]);
  const state = useSyncExternalStore(
    host.subscribe,
    host.getSnapshot,
    host.getSnapshot,
  );

  const renewal = useSessionRenewal({
    host,
    status: state.status,
    bound,
    reopen,
    now,
  });
  useEffect(() => {
    if (!renewal.accessLost) return;
    const exactConversation =
      bound.last()?.context.conversationId ??
      conversationId ??
      opening.hints.conversationId;
    clear(exactConversation);
  }, [
    renewal.accessLost,
    bound,
    conversationId,
    opening.hints.conversationId,
    clear,
  ]);

  return {
    state: storageError ? { status: "unavailable" as const } : state,
    storageError,
    ...renewal,
    conversationId:
      bound.last()?.context.conversationId ?? opening.hints.conversationId,
    pending: opening.pending,
    retry: () => retry(state.status),
    reopen,
  };
}
