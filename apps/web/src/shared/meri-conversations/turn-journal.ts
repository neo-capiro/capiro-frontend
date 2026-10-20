import type { QueryClient } from "@tanstack/react-query";
import type { RunBinding } from "@capiro/meri-contracts";
import type { ConversationAccount } from "./host-controller";
import {
  ConversationHistoryUnavailable,
  type ConversationTurnReceipt,
} from "./history-client";

/**
 * Meri refuses a next turn with 409 CONVERSATION_TURN_CONFLICT, outcome NOT_DISPATCHED, while the previous run is
 * still being stopped and retired (its reconcile runs up to 85 s). Nothing was reserved, so the same intent is
 * asked again at this cadence until this long has passed, then the refusal stands.
 */
export const TURN_SETTLE_WAIT_MS = 90_000;
export const TURN_SETTLE_RETRY_MS = 3_000;

/** Nonsecret immutable submit identity exists before reservation dispatch, not after its ACK. */
export type TurnIntent = Readonly<{
  source: RunBinding;
  requestId: string;
  prompt: string;
  state: "reserving" | "unknown" | "ready";
  receipt?: ConversationTurnReceipt;
}>;

/** Keep retained command identity independent of later response-object mutations. */
function snapshotIntent(intent: TurnIntent) {
  const receipt = intent.receipt
    ? Object.freeze({
        ...intent.receipt,
        sourceBinding: Object.freeze({ ...intent.receipt.sourceBinding }),
        targetBinding: Object.freeze({ ...intent.receipt.targetBinding }),
      })
    : undefined;
  return Object.freeze({
    ...intent,
    source: Object.freeze({ ...intent.source }),
    ...(receipt ? { receipt } : {}),
  });
}

/** Scope memory only. A hard reload loses this identity and must show the server reservation barrier. */
export function conversationTurnJournal(
  cache: QueryClient,
  account: ConversationAccount,
  clientId: string,
  conversationId: string,
) {
  const key = [
    "meri-conversation-turn",
    account.tenantId,
    account.actorId,
    clientId,
    conversationId,
  ];
  cache.setQueryDefaults(key, { gcTime: Infinity, structuralSharing: false });
  cache.setQueryData<{ intent?: TurnIntent }>(
    key,
    (previous) => previous ?? {},
  );
  const queries = cache.getQueryCache(),
    owned = queries.find({ queryKey: key, exact: true });
  const current = () =>
    owned !== undefined &&
    queries.find({ queryKey: key, exact: true }) === owned;
  const read = () =>
    current()
      ? cache.getQueryData<{ intent?: TurnIntent }>(key)?.intent
      : undefined;
  const store = (intent: TurnIntent) => {
    if (!current()) return false;
    cache.setQueryData(key, Object.freeze({ intent: snapshotIntent(intent) }));
    return true;
  };
  const write = (intent: TurnIntent) => {
    const previous = read();
    if (
      previous &&
      (previous.requestId !== intent.requestId ||
        previous.prompt !== intent.prompt ||
        previous.source.runId !== intent.source.runId)
    )
      return false;
    return store(intent);
  };
  return {
    current,
    read,
    write,
    start(source: RunBinding, prompt: string, requestId: string) {
      if (
        !current() ||
        source.tenantId !== account.tenantId ||
        source.actorId !== account.actorId ||
        source.conversationId !== conversationId
      )
        throw new Error("Turn scope changed");
      const previous = read();
      if (
        previous &&
        (!previous.receipt ||
          Object.keys(source).some(
            (key) =>
              previous.receipt!.targetBinding[key as keyof RunBinding] !==
              source[key as keyof RunBinding],
          ))
      )
        throw new Error("Recover the retained turn first");
      const intent: TurnIntent = Object.freeze({
        source: Object.freeze({ ...source }),
        prompt,
        requestId,
        state: "reserving",
      });
      store(intent);
      return intent;
    },
  };
}

/** Reservation retries always replay the original source, even after UNKNOWN or an accepted target. */
export async function recoverConversationTurn(
  journal: ReturnType<typeof conversationTurnJournal>,
  reserve: (input: {
    conversationId: string;
    sourceRunId: string;
  }) => Promise<ConversationTurnReceipt>,
) {
  const intent = journal.read();
  if (!intent || !journal.current())
    throw new Error("Immutable turn identity unavailable");
  try {
    const receipt = await reserve({
      conversationId: intent.source.conversationId,
      sourceRunId: intent.source.runId,
    });
    for (const key of [
      "tenantId",
      "actorId",
      "conversationId",
      "runId",
      "attemptId",
      "workerId",
      "writerFence",
    ] as const)
      if (
        receipt.sourceBinding[key] !== intent.source[key] ||
        (intent.receipt &&
          receipt.targetBinding[key] !== intent.receipt.targetBinding[key])
      )
        throw new Error("Turn binding changed");
    if (!journal.write({ ...intent, receipt, state: "ready" }))
      throw new Error("Turn scope changed");
    return journal.read()!;
  } catch (cause) {
    journal.write({ ...intent, state: "unknown" });
    throw cause;
  }
}

const sourceSettling = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  error.status === 409 &&
  error.code === "CONVERSATION_TURN_CONFLICT" &&
  error.outcome === "NOT_DISPATCHED";

const pause = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const stop = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", stop);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", stop, { once: true });
  });

/** recoverConversationTurn, asked again while Meri reports that the previous run is still settling. */
export async function reserveTurnWhenSettled(
  journal: ReturnType<typeof conversationTurnJournal>,
  reserve: Parameters<typeof recoverConversationTurn>[1],
  signal: AbortSignal,
  now: () => number = Date.now,
) {
  const started = now();
  for (;;) {
    try {
      return await recoverConversationTurn(journal, reserve);
    } catch (error) {
      if (
        !sourceSettling(error) ||
        now() - started + TURN_SETTLE_RETRY_MS > TURN_SETTLE_WAIT_MS
      )
        throw error;
    }
    await pause(TURN_SETTLE_RETRY_MS, signal);
  }
}
