"use client";
import type { ResearchSelection } from "../../../shared/meri-conversations/research-context";
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
import { reconnectState, transientStatus } from "./control-reachability";
import { useReconnectSchedule } from "../../../shared/meri-conversations/reconnect-schedule";
import {
  createOpeningCapture,
  type OpeningCapture,
} from "../../../shared/meri-conversations/opening-capture";

type Hints = ConstructorParameters<
  typeof ConversationHostController
>[0]["hints"];
type Opening = Readonly<{
  host: ConversationHostController;
  hints: Hints;
  renewal?: boolean;
  /** A prompt the person sent that waits for this fresh run's session. */
  pending?: string;
}>;
type Reopening = {
  target?: { conversationId: string; runId: string };
  pending?: string;
  renewal?: boolean;
  /** Recovering this binding, not opening a new one: the exact requested run is mandatory. */
  recovery?: boolean;
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
  // Keep private data hidden through explicit retry until a fresh receipt is validated. An issuance that
  // persisted through the bounded retries without an answer is not a refusal: control answers 503 when an
  // authority owner did not answer, and the same-origin proxy answers 5xx for an unreachable control. For a
  // conversation this tab already holds, what it holds stays readable while the renewal is asked again on the
  // reconnect schedule; a first open has nothing to keep and stays the reconnect panel. Control answers 401
  // SESSION_REFUSED only for a definitive refusal (changed identity or member fact, removed client), so a 401,
  // like a 403 or a port-level denial, hides the conversation, for an ordinary renewal as for a refused one.
  const [denied, setDenied] = useState(false);
  const issuance = host.getIssuanceStatus();
  const unverified =
    status === "unavailable" &&
    transientStatus(issuance) &&
    bound.last() !== null;
  const revoked = host.getExpirationReason() === "access-lost" && !unverified;
  if (revoked && !denied) setDenied(true);
  else if (status === "ready" && denied) setDenied(false);
  const accessLost = revoked || (denied && status !== "ready");

  const renewed = useRef<string | null>(null);
  // The binding whose credential control refused and this tab renewed once; an ordinary renewal, or a session
  // bound to another run, clears it.
  const refusedOnce = useRef<string | null>(null);
  useEffect(() => {
    const last = bound.last();
    if (
      status === "ready" &&
      last &&
      refusedOnce.current !== JSON.stringify(last.context)
    )
      refusedOnce.current = null;
  }, [status, bound]);
  useEffect(() => {
    const last = bound.last();
    if (status !== "expired" || !last) return;
    const reason = host.getExpirationReason();
    if (reason !== "renewal" && reason !== "expiry" && reason !== "refused")
      return;
    const key = JSON.stringify(last.context) + last.at;
    if (renewed.current === key) return;
    renewed.current = key;
    const binding = JSON.stringify(last.context);
    if (reason === "refused") {
      // Control no longer held the credential (SESSION_REFUSED on the event stream): renew it once for the same
      // exact binding; issuance rechecks identity and membership and its own 403 still hides the conversation. The
      // renewed credential refused again before an ordinary renewal is access lost, never another renewal.
      if (refusedOnce.current === binding) return host.revoke();
      refusedOnce.current = binding;
    } else refusedOnce.current = null;
    reopen({ renewal: reason !== "expiry", recovery: true });
  }, [status, reopen, bound, host]);

  return {
    accessLost,
    unverified,
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
  capture?: OpeningCapture,
) {
  const { selection, storageError, record } = retention;
  const create = useCallback(
    // A recovery reopens what this binding already holds: it says so, so the host can refuse a
    // different run before anything is recorded or exposed.
    (hints: Hints, recovery = false, openingCapture?: OpeningCapture) =>
      new ConversationHostController({
        account,
        hints,
        ...(openingCapture ? { openingCapture } : {}),
        ...(recovery ? { recovery: true } : {}),
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
      false,
      capture,
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
      if (
        target &&
        "scopeKind" in selection.hints &&
        target.conversationId !== selection.hints.conversationId
      )
        throw Error("Research conversation target unavailable");
      const hints = target
        ? {
            ...selection.hints,
            conversationId: target.conversationId,
            runId: target.runId,
          }
        : selection.hints;
      setOpening({
        host: create(hints, options.recovery === true),
        hints,
        ...(options.renewal ? { renewal: true } : {}),
        ...(options.pending ? { pending: options.pending } : {}),
      });
    },
    [create, selection, bound, storageError],
  );

  return {
    opening,
    reopen,
    /**
     * Recovery never widens. Both retry paths reuse the exact binding this tab already holds, so a
     * conversation-scope issuance - which the service may answer by reserving a successor - is never
     * requested merely to recover access. The bound exact context is preferred; the opening hints are only
     * a fallback for a tab that has not yet been bound.
     */
    retry: (status: string) => {
      const target =
        exactTarget(bound.last()?.context) ?? exactTarget(opening.hints);
      // A recovery opening is read-only: it reauthorizes this exact binding and reads. The prompt of the
      // authorized send it replaces is not re-supplied, so the recovered port cannot submit that message
      // again; the draft, request and turn journals keep their own state.
      if (status === "expired") return reopen({ target, recovery: true });
      const hints = target
        ? {
            ...opening.hints,
            conversationId: target.conversationId,
            runId: target.runId,
          }
        : opening.hints;
      setOpening({
        host: create(hints, true),
        hints,
        ...(opening.renewal ? { renewal: true } : {}),
      });
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
  research?: ResearchSelection,
) {
  const [capture] = useState(() =>
    !research && conversationId && typeof window !== "undefined"
      ? createOpeningCapture(window.location.search)
      : undefined,
  );
  const { selection, storageError, record, clear } = useConversationSelection(
    account,
    clientId,
    conversationId,
    research,
  );
  const [bound] = useState(boundContext);
  const { opening, reopen, retry } = useConversationOpening(
    account,
    clientId,
    conversationId,
    now,
    bound,
    { selection, storageError, record },
    capture,
  );
  const { host } = opening;
  useLayoutEffect(() => {
    host.setClientAvailable(!storageError);
    if (storageError) capture?.stop();
    return () => {
      host.setClientAvailable(false);
      capture?.stop();
    };
  }, [host, storageError, capture]);
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

  /** Issuance ended on a gateway/overload answer: control did not answer, nothing was refused. */
  const unreachable =
    !storageError &&
    state.status === "unavailable" &&
    transientStatus(host.getIssuanceStatus());
  // A renewal that control did not answer is asked again on a backed-off schedule owned here, where it
  // outlives the host each attempt creates and the notice that comes and goes with it; the notice only
  // presents it. A first open has its own schedule in the status panel. Success resets the ladder.
  const reconnect = useReconnectSchedule(
    reconnectState(unreachable && renewal.unverified, state.status),
    useCallback(() => retry(state.status), [retry, state.status]),
  );

  return {
    capture,
    captureHints: { ...(selection?.hints ?? opening.hints) },
    state: storageError ? { status: "unavailable" as const } : state,
    // Display continuity only: the disposed port still cannot issue any request.
    renewing:
      !storageError &&
      ((state.status === "expired" &&
        (host.getExpirationReason() === "renewal" ||
          host.getExpirationReason() === "refused")) ||
        (!!opening.renewal &&
          (state.status === "idle" || state.status === "connecting"))),
    storageError,
    ...renewal,
    unreachable,
    /** An automatic renewal attempt is scheduled; an explicit retry starts the ladder over. */
    reconnecting: reconnect.pending,
    resetReconnect: reconnect.reset,
    conversationId:
      bound.last()?.context.conversationId ?? opening.hints.conversationId,
    runId: bound.last()?.context.runId ?? opening.hints.runId,
    pending: opening.pending,
    retry: () => retry(state.status),
    reopen,
  };
}
