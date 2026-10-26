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
import { conversationRetryHints } from "./conversation-retry-hints";

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
}: {
  host: ConversationHostController;
  status: ReturnType<ConversationHostController["getSnapshot"]>["status"];
  bound: ReturnType<typeof boundContext>;
  reopen: (options?: Reopening) => void;
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
    if (reason !== "renewal" && reason !== "expiry") return;
    const key = JSON.stringify(last.context) + last.at;
    if (renewed.current === key) return;
    renewed.current = key;
    reopen();
  }, [status, reopen, bound, host]);

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
    /**
     * A lost session whose conversation provably never started is re-opened at conversation scope
     * so the service can re-prepare the original it refused; every started or ambiguous case and
     * every other retry keeps its exact binding (an exact run never reserves a successor; a
     * conversation-scope issuance on a finished run would). Recovery never sends or replays input.
     */
    retry: (
      status: string,
      recovery: { accessLost: boolean; unstarted: boolean },
    ) => {
      const conversation =
        bound.last()?.context.conversationId ??
        conversationId ??
        opening.hints.conversationId;
      const hints = conversationRetryHints({
        ...recovery,
        clientId,
        conversationId: conversation,
      });
      if (hints)
        return setOpening({
          ...opening,
          host: create(hints),
          hints,
        });
      return status === "expired"
        ? reopen({
            target: exactTarget(opening.hints),
            pending: opening.pending,
          })
        : setOpening({ ...opening, host: create(opening.hints) });
    },
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
  });
  /** What the retired recovery held for the lost conversation: read once, before it is cleared. */
  const lost = useRef<
    { conversationId: string; retainedInput: boolean } | undefined
  >(undefined);
  useEffect(() => {
    if (!renewal.accessLost) return;
    const last = bound.last()?.context;
    const exactConversation =
      last?.conversationId ?? conversationId ?? opening.hints.conversationId;
    const retainedInput = clear(
      exactConversation,
      last?.runId ?? opening.hints.runId,
    );
    if (exactConversation)
      lost.current = { conversationId: exactConversation, retainedInput };
  }, [
    renewal.accessLost,
    bound,
    conversationId,
    opening.hints.conversationId,
    opening.hints.runId,
    clear,
  ]);

  return {
    state: storageError ? { status: "unavailable" as const } : state,
    storageError,
    ...renewal,
    conversationId:
      bound.last()?.context.conversationId ?? opening.hints.conversationId,
    pending: opening.pending,
    /**
     * `unstarted` is the caller's durable-owner fact (history answered NOT_FOUND: the conversation
     * has no run). It counts only when this tab retained no submission for the lost run.
     */
    retry: (proof?: { unstarted: boolean }) => {
      const exactConversation =
        bound.last()?.context.conversationId ??
        conversationId ??
        opening.hints.conversationId;
      const retired = lost.current;
      retry(state.status, {
        accessLost: renewal.accessLost,
        unstarted:
          proof?.unstarted === true &&
          retired !== undefined &&
          retired.conversationId === exactConversation &&
          !retired.retainedInput,
      });
    },
    reopen,
  };
}
