import type { QueryClient } from "@tanstack/react-query";
import type { RunBinding } from "@capiro/meri-contracts";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import {
  retainedRequest,
  skillSelectionFields,
  type ConversationSkillSelection,
  storedSubmission,
  submissionIdentity,
} from "./query-journal";
import {
  recoverOpenedReservation,
  recoverPersistedTurn,
} from "./turn-persistence";
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
  skill?: ConversationSubmitRequest["skill"];
  windowRequest?: ConversationSubmitRequest["windowRequest"];
  work?: ConversationSkillSelection["work"];
  procedure?: ConversationSubmitRequest["procedure"];
  siteWorkflow?: ConversationSubmitRequest["siteWorkflow"];
  /** Files the next message carries: the exact ids and digests the composer offered when it was sent. */
  uploads?: ConversationSubmitRequest["uploads"];
  state: "reserving" | "unknown" | "ready";
  receipt?: ConversationTurnReceipt;
}>;

const frozenUploads = (uploads: NonNullable<TurnIntent["uploads"]>) =>
  Object.freeze(
    uploads.map((upload) => Object.freeze({ ...upload })),
  ) as NonNullable<TurnIntent["uploads"]>;

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
    ...skillSelectionFields(intent),
    ...(intent.modelSelection
      ? { modelSelection: Object.freeze({ ...intent.modelSelection }) }
      : {}),
    ...(intent.uploads ? { uploads: frozenUploads(intent.uploads) } : {}),
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
      ...skillSelectionFields(intent),
      ...(intent.uploads ? { uploads: intent.uploads } : {}),
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
  // Control's own answer that one reservation admitted no message belongs to this tab's exact
  // conversation; without it every later page asks the same question again.
  const openedReservation = recoverOpenedReservation(
    { ...account, clientId, conversationId },
    storage,
  );
  /**
   * A newer message, a newer admission or an explicit give-up supersedes that answer: it only ever
   * established that one target was empty when control answered, so it must not outlive its
   * lifecycle and silently settle a later uncertainty. A retirement this tab could not make durable
   * is not a retirement, so an unretired answer stops being trusted too.
   */
  let openedRetired = false;
  const retireOpened = () => {
    if (openedReservation && !openedReservation.retire()) openedRetired = true;
  };
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
    // This tab now holds a newer message: an earlier "nothing admitted" answer no longer settles it.
    retireOpened();
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
        ...skillSelectionFields(previous),
        modelSelection: previous.modelSelection,
        uploads: previous.uploads,
      }) !==
        submissionIdentity({
          requestId: intent.requestId,
          prompt: intent.prompt,
          ...skillSelectionFields(intent),
          modelSelection: intent.modelSelection,
          uploads: intent.uploads,
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
    /** Control confirmed nothing was admitted for the retained turn, or the person discarded it. */
    discard() {
      const intent = read();
      // This view's give-up unlocks the composer; it never claims control settled a later message.
      retireOpened();
      if (!intent) return undefined;
      retained.record?.clear();
      cache.setQueryData(key, Object.freeze({}));
      return intent;
    },
    /**
     * Target run id of the reservation control already confirmed admitted no message in this tab,
     * unless something newer owns that target. One immutable target per source identifies the
     * reservation; an ordinary message sent into that same target is the request journal's from then
     * on, so control's earlier answer no longer settles it - and a request this page cannot read
     * proves no absence either.
     */
    openedTarget: () => {
      if (openedRetired) return undefined;
      const confirmed = openedReservation?.read();
      if (!confirmed) return undefined;
      const request = retainedRequest(
        {
          tenantId: account.tenantId,
          actorId: account.actorId,
          clientId,
          conversationId,
        },
        confirmed.targetRunId,
        storage,
      );
      return request.state === "absent" ? confirmed.targetRunId : undefined;
    },
    /**
     * Keep control's own RESERVED answer: that exact source's successor admitted no message. The
     * answer outlives this page in this tab only; the saved read still reports the reservation.
     */
    confirmOpened(
      receipt: Pick<ConversationTurnReceipt, "sourceBinding" | "targetBinding">,
    ) {
      for (const binding of [receipt.sourceBinding, receipt.targetBinding])
        if (
          binding.tenantId !== account.tenantId ||
          binding.actorId !== account.actorId ||
          binding.conversationId !== conversationId
        )
          return;
      openedReservation?.write({
        sourceRunId: receipt.sourceBinding.runId,
        targetRunId: receipt.targetBinding.runId,
      });
    },
    retireOpened,
    start(
      source: RunBinding,
      prompt: string,
      requestId: string,
      modelSelection?: ConversationSubmitRequest["modelSelection"],
      selection: ConversationSkillSelection = {},
      uploads?: ConversationSubmitRequest["uploads"],
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
        ...skillSelectionFields(selection),
        ...(modelSelection
          ? { modelSelection: Object.freeze({ ...modelSelection }) }
          : {}),
        ...(uploads?.length ? { uploads: frozenUploads(uploads) } : {}),
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

/**
 * "Check again" for a pending next message: replay the exact source mapping (one immutable target per
 * source) of the retained turn, or of the reservation control reported when this tab kept none.
 * RESERVED is control's own answer that the target admitted no message, so the retained turn is
 * released and this tab keeps the answer; ACCEPTED leaves it, with its receipt, for recovery of that
 * exact target and request id. A failure leaves everything as it was.
 */
export async function checkConversationTurn(
  journal: ReturnType<typeof conversationTurnJournal>,
  reported: Pick<RunBinding, "conversationId" | "runId"> | undefined,
  reserve: (input: {
    conversationId: string;
    sourceRunId: string;
  }) => Promise<ConversationTurnReceipt>,
  signal?: AbortSignal,
) {
  const retained = journal.read();
  if (!retained && !reported) return undefined;
  const receipt = retained
    ? (await recoverConversationTurn(journal, reserve, signal)).receipt!
    : await reserve({
        conversationId: reported!.conversationId,
        sourceRunId: reported!.runId,
      });
  signal?.throwIfAborted();
  if (!retained && receipt.sourceBinding.runId !== reported!.runId)
    throw new Error("Turn binding changed");
  if (receipt.state !== "RESERVED") {
    // Control reports a target for this message: nothing here is an unconfirmed empty reservation.
    journal.retireOpened();
    return { target: receipt.targetBinding, retained: journal.read() };
  }
  const released = journal.discard();
  // This tab asked about this exact reservation and control answered that nothing was admitted: a
  // reload of the same page reopens it instead of asking the same question again.
  journal.confirmOpened(receipt);
  return { target: receipt.targetBinding, released };
}

/** Only this explicit refusal proves that no next turn was dispatched. */
export const conversationTurnNotReady = (error: unknown) =>
  error instanceof ConversationHistoryUnavailable &&
  error.status === 409 &&
  error.code === "CONVERSATION_TURN_CONFLICT" &&
  error.outcome === "NOT_DISPATCHED";
