import type { QueryClient } from "@tanstack/react-query";
import type { RunBinding } from "@capiro/meri-contracts";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import { submissionIdentity } from "./query-journal";
import { recoverPersistedTurn } from "./turn-persistence";
import { TabJournalUnavailable, type TabStorage } from "./tab-journal";
import type { ConversationAccount } from "./host-controller";
import {
  ConversationHistoryUnavailable,
  type ConversationTurnReceipt,
} from "./history-client";

/** Nonsecret immutable submit identity exists before reservation dispatch, not after its ACK. */
export type TurnIntent = Readonly<{
  source: Pick<
    RunBinding,
    "tenantId" | "actorId" | "conversationId" | "runId"
  > &
    Partial<RunBinding>;
  requestId: string;
  prompt: string;
  modelSelection?: ConversationSubmitRequest["modelSelection"];
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
    ...(intent.modelSelection
      ? { modelSelection: Object.freeze({ ...intent.modelSelection }) }
      : {}),
    ...(receipt ? { receipt } : {}),
  });
}

/** The next input may advance only from the target of the already retained turn. */
function requirePreviousTarget(
  previous: TurnIntent | undefined,
  source: RunBinding,
) {
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
}

/** Same-tab identity survives reload; the reservation mapping must still be recovered explicitly. */
export function conversationTurnJournal(
  cache: QueryClient,
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string,
  storage?: TabStorage,
) {
  const key = [
    "meri-conversation-turn",
    account.tenantId,
    account.actorId,
    clientId,
    conversationId,
  ];
  cache.setQueryDefaults(key, { gcTime: Infinity, structuralSharing: false });
  const retained = recoverPersistedTurn(
    { ...account, clientId, conversationId },
    storage,
  );
  cache.setQueryData<{ intent?: TurnIntent }>(
    key,
    (previous) =>
      previous ??
      (retained.intent ? { intent: snapshotIntent(retained.intent) } : {}),
  );
  const queries = cache.getQueryCache(),
    owned = queries.find({ queryKey: key, exact: true });
  const current = () =>
    !retained.blocked &&
    (retained.record?.current() ?? true) &&
    owned !== undefined &&
    queries.find({ queryKey: key, exact: true }) === owned;
  const read = () =>
    current()
      ? cache.getQueryData<{ intent?: TurnIntent }>(key)?.intent
      : undefined;
  const store = (intent: TurnIntent) => {
    if (retained.blocked) throw new TabJournalUnavailable();
    if (!current()) return false;
    retained.record?.write(intent);
    cache.setQueryData(key, Object.freeze({ intent: snapshotIntent(intent) }));
    return true;
  };
  const write = (intent: TurnIntent) => {
    const previous = read();
    if (
      previous &&
      (previous.requestId !== intent.requestId ||
        previous.prompt !== intent.prompt ||
        submissionIdentity({
          requestId: intent.requestId,
          prompt: intent.prompt,
          modelSelection: previous.modelSelection,
        }) !==
          submissionIdentity({
            requestId: intent.requestId,
            prompt: intent.prompt,
            modelSelection: intent.modelSelection,
          }) ||
        previous.source.runId !== intent.source.runId)
    )
      return false;
    return store(intent);
  };
  return {
    current,
    recoveryBlocked: retained.blocked,
    read,
    write,
    start(
      source: RunBinding,
      prompt: string,
      requestId: string,
      modelSelection?: ConversationSubmitRequest["modelSelection"],
    ) {
      if (
        !current() ||
        source.tenantId !== account.tenantId ||
        source.actorId !== account.actorId ||
        source.conversationId !== conversationId
      )
        throw new Error("Turn scope changed");
      requirePreviousTarget(read(), source);
      const intent: TurnIntent = Object.freeze({
        source: Object.freeze({ ...source }),
        prompt,
        requestId,
        ...(modelSelection
          ? { modelSelection: Object.freeze({ ...modelSelection }) }
          : {}),
        state: "reserving",
      });
      store(intent);
      return intent;
    },
  };
}

/** One explicit command attempts one reservation of the retained source, including after UNKNOWN. */
export async function recoverConversationTurn(
  journal: ReturnType<typeof conversationTurnJournal>,
  reserve: (input: {
    conversationId: string;
    sourceRunId: string;
  }) => Promise<ConversationTurnReceipt>,
  signal?: AbortSignal,
) {
  const intent = journal.read();
  if (!intent || !journal.current())
    throw new Error("Immutable turn identity unavailable");
  try {
    signal?.throwIfAborted();
    const receipt = await reserve({
      conversationId: intent.source.conversationId,
      sourceRunId: intent.source.runId,
    });
    signal?.throwIfAborted();
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
        (intent.source[key] !== undefined &&
          receipt.sourceBinding[key] !== intent.source[key]) ||
        (intent.receipt &&
          receipt.targetBinding[key] !== intent.receipt.targetBinding[key])
      )
        throw new Error("Turn binding changed");
    if (
      !journal.write({
        ...intent,
        source: receipt.sourceBinding,
        receipt,
        state: "ready",
      })
    )
      throw new Error("Turn scope changed");
    return journal.read()!;
  } catch (cause) {
    journal.write({ ...intent, state: "unknown" });
    throw cause;
  }
}

/** Only this explicit refusal proves that no next turn was dispatched. */
export const conversationTurnNotReady = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  error.status === 409 &&
  error.code === "CONVERSATION_TURN_CONFLICT" &&
  error.outcome === "NOT_DISPATCHED";
