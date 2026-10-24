import type { QueryClient } from "@tanstack/react-query";
import type { RunBinding } from "@capiro/meri-contracts";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import { storedSubmission, submissionIdentity } from "./query-journal";
import { recoverPersistedTurn } from "./turn-persistence";
import { TabJournalUnavailable, type TabStorage } from "./tab-journal";
import { conversationInClient } from "./history-pages";
import type { ConversationAccount } from "./host-controller";
import {
  ConversationHistoryUnavailable,
  type ConversationTurnReceipt,
  type ConversationTranscriptPage,
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

/** Fresh scoped history can consume a completed request, never manufacture a reservation receipt. */
function completedRequest(
  page: ConversationTranscriptPage,
  intent: TurnIntent | undefined,
  account: ConversationAccount,
  clientId: string | null,
  conversationId: string,
) {
  if (
    !intent ||
    page.pendingTurn ||
    page.conversation.conversationId !== conversationId ||
    page.conversation.owner.tenantId !== account.tenantId ||
    page.conversation.owner.actorId !== account.actorId ||
    !conversationInClient(page.conversation, account, clientId) ||
    !["completed", "failed", "cancelled"].includes(page.latestRun.state)
  )
    return false;
  const target = page.turns.find(
    (turn) => turn.run.binding.runId === page.latestRun.binding.runId,
  );
  if (
    !target ||
    target.run.state !== page.latestRun.state ||
    target.run.binding.runId === intent.source.runId ||
    target.run.binding.tenantId !== account.tenantId ||
    target.run.binding.actorId !== account.actorId ||
    target.run.binding.conversationId !== conversationId ||
    Object.entries(page.latestRun.binding).some(
      ([key, value]) => target.run.binding[key as keyof RunBinding] !== value,
    ) ||
    (intent.receipt &&
      Object.entries(intent.receipt.targetBinding).some(
        ([key, value]) => target.run.binding[key as keyof RunBinding] !== value,
      ))
  )
    return false;
  const actual = {
    ...storedSubmission({
      ...target.request,
      windowRequest: target.request.windowRequest ?? null,
    }),
  };
  if (intent.modelSelection === undefined) delete actual.modelSelection;
  return (
    submissionIdentity(actual) ===
    submissionIdentity({
      requestId: intent.requestId,
      prompt: intent.prompt,
      ...(intent.modelSelection
        ? { modelSelection: intent.modelSelection }
        : {}),
    })
  );
}

/** Same-tab identity survives reload; unresolved reservation mappings need explicit recovery. */
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
      !previous ||
      previous.requestId !== intent.requestId ||
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
      previous.source.runId !== intent.source.runId
    )
      return false;
    return store(intent);
  };
  return {
    current,
    recoveryBlocked: retained.blocked,
    read,
    write,
    canAcknowledgeCompleted: (page: ConversationTranscriptPage) =>
      completedRequest(page, read(), account, clientId, conversationId),
    acknowledgeCompleted(page: ConversationTranscriptPage) {
      if (!completedRequest(page, read(), account, clientId, conversationId))
        return false;
      retained.record?.clear();
      cache.setQueryData(key, Object.freeze({}));
      return true;
    },
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
