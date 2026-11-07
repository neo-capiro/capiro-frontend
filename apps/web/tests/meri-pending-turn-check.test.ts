import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationTurn } from "../src/features/meri/conversation/useConversationTurn";
import { sessionHistoryState } from "../src/features/meri/conversation/saved-turns";
import { composerAvailability } from "../src/features/meri/conversation/MeriLiveConversation";
import { ConversationHistoryStatus } from "../src/features/meri/conversation/ConversationHistoryStatus";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { conversationTurnJournal } from "../src/shared/meri-conversations/turn-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import * as transport from "../src/shared/meri-conversations/history-client";
import {
  binding,
  nextBinding,
  clientId,
  event,
  status,
} from "../test/browser/meri-conversation-fixtures";
import {
  conversation,
  turn,
  nextRequestId,
} from "../test/browser/meri-history-fixtures";

// The pending next message after a reopened page: "Check again" asks control about that exact
// reservation and settles it; an answer that stays uncertain can be discarded explicitly.
const buttons = vi.hoisted(
  () => [] as Array<{ onClick: () => void; children: ReactNode }>,
);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
const account = { tenantId: binding.tenantId, actorId: binding.actorId };
const prompt = "Synthetic unsent next message";
const scope = { ...account, clientId, conversationId: binding.conversationId };
function memory() {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
  };
  syncMeriTabIdentity("synthetic-signed-in", storage);
  vi.stubGlobal("window", { sessionStorage: storage });
  return storage;
}
const stored = (storage: TabStorage) =>
  Array.from({ length: storage.length }, (_, i) =>
    storage.getItem(storage.key(i)!),
  ).join("\n");
const receipt = (state: "RESERVED" | "ACCEPTED") => ({
  schema: "meri.conversation-turn/1" as const,
  sourceBinding: binding,
  targetBinding: nextBinding,
  state,
  replayed: true,
});
/** Control's own report: the source's successor is reserved and has admitted no message. */
const reservedPage = {
  turns: [],
  events: [],
  latestRun: { binding, state: "completed" },
  pendingTurn: {
    sourceBinding: binding,
    targetBinding: nextBinding,
    state: "RESERVED",
  },
} as unknown as transport.ConversationTranscriptPage;
let storage: TabStorage;
beforeEach(() => {
  buttons.length = 0;
  storage = memory();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function journal(cache: QueryClient) {
  return conversationTurnJournal(
    cache,
    account,
    clientId,
    binding.conversationId,
    storage,
  );
}
function mount(cache: QueryClient) {
  const open = vi.fn();
  let command!: ReturnType<typeof useConversationTurn>;
  function Probe() {
    command = useConversationTurn(
      account,
      clientId,
      binding.conversationId,
      open,
    );
    return null;
  }
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: cache }, createElement(Probe)),
  );
  return { command, open };
}
/** A reload restores the retained next message as uncertain, with no reservation receipt. */
function reloadedRetained() {
  journal(new QueryClient()).start(binding, prompt, nextRequestId);
  return new QueryClient();
}

it("the server has a run for the retained message: the check opens that exact target, nothing is released", async () => {
  const cache = reloadedRetained();
  const reserve = vi
    .spyOn(transport, "reserveConversationTurn")
    .mockResolvedValue(receipt("ACCEPTED"));
  const { command, open } = mount(cache);
  const restore = vi.fn();
  expect(await command.check(undefined, restore)).toBe(true);
  expect(reserve).toHaveBeenCalledExactlyOnceWith(
    { conversationId: binding.conversationId, sourceRunId: binding.runId },
    expect.any(AbortSignal),
  );
  // Opening the exact target replays the same request id there; nothing new is sent.
  expect(open).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      runId: nextBinding.runId,
      requestId: nextRequestId,
      pending: prompt,
    }),
  );
  expect(restore).not.toHaveBeenCalled();
  expect(journal(cache).read()).toMatchObject({
    requestId: nextRequestId,
    prompt,
    state: "ready",
  });
});

it("the server definitively has no run: the pending marker clears, the composer unlocks and the text comes back", async () => {
  const cache = reloadedRetained();
  expect(stored(storage)).toContain(prompt);
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("RESERVED"),
  );
  const { command, open } = mount(cache);
  const restore = vi.fn();
  expect(await command.check(undefined, restore)).toBe(true);
  expect(open).not.toHaveBeenCalled();
  expect(restore).toHaveBeenCalledExactlyOnceWith(prompt);
  expect(journal(cache).read()).toBeUndefined();
  expect(stored(storage)).not.toContain(prompt);

  // The view of that confirmed reservation: no lock, and its source admits the next message.
  const locked = sessionHistoryState(
    { current: reservedPage },
    binding.runId,
    [],
    undefined,
    false,
  );
  expect(locked.unknownReservation).toBe(true);
  expect(locked.source).toBeUndefined();
  const opened = sessionHistoryState(
    { current: reservedPage },
    binding.runId,
    [],
    undefined,
    false,
    undefined,
    nextBinding.runId,
  );
  expect(opened.unknownReservation).toBe(false);
  expect(opened.recoveryNeeded).toBe(false);
  expect(opened.nextBlocked).toBeUndefined();
  expect(opened.nextChecking).toBe(false);
  expect(opened.source).toEqual(binding);
  expect(opened.openedTarget).toBe(nextBinding.runId);

  // A session bound to the reserved target itself sends an ordinary new request to it.
  const run = {
    intent: {},
    busy: false,
    failure: undefined,
    refusal: undefined,
    snapshot: { status: "unavailable", observation: null },
  } as never;
  const held = composerAvailability(
    run,
    null,
    [{} as never],
    undefined,
    locked.initialBlocked,
    undefined,
    locked.nextBlocked,
    false,
    false,
  );
  expect(held.sendBlocked).toBe(locked.initialBlocked);
  const unlocked = composerAvailability(
    run,
    null,
    [{} as never],
    undefined,
    opened.initialBlocked,
    undefined,
    opened.nextBlocked,
    false,
    false,
    true,
  );
  expect(unlocked.resend).toBe(true);
  expect(unlocked.initial).toBe(false);
  expect(unlocked.sendBlocked).toBeUndefined();
});

it("a reopened page with no retained message settles control's reported reservation the same way", async () => {
  const cache = new QueryClient();
  const reserve = vi
    .spyOn(transport, "reserveConversationTurn")
    .mockResolvedValue(receipt("RESERVED"));
  const { command, open } = mount(cache);
  const restore = vi.fn();
  expect(await command.check(binding, restore)).toBe(true);
  expect(reserve).toHaveBeenCalledExactlyOnceWith(
    { conversationId: binding.conversationId, sourceRunId: binding.runId },
    expect.any(AbortSignal),
  );
  expect(open).not.toHaveBeenCalled();
  // This tab never kept the text, so there is nothing to put back.
  expect(restore).toHaveBeenCalledExactlyOnceWith(undefined);
});

it("an answer that stays uncertain keeps the notice and the message, and offers an explicit discard", async () => {
  const cache = reloadedRetained();
  vi.spyOn(transport, "reserveConversationTurn").mockRejectedValue(
    new transport.ConversationHistoryUnavailable(
      502,
      "CONVERSATION_UNAVAILABLE",
    ),
  );
  const { command, open } = mount(cache);
  const restore = vi.fn();
  expect(await command.check(undefined, restore)).toBe(false);
  expect(open).not.toHaveBeenCalled();
  expect(restore).not.toHaveBeenCalled();
  expect(journal(cache).read()).toMatchObject({
    requestId: nextRequestId,
    prompt,
    state: "unknown",
  });

  const session = {
    history: {
      selected: true,
      unavailable: false,
      query: { isPending: false, isFetching: false, hasNextPage: false },
      tail: {},
      refresh: vi.fn(),
    },
    continuation: {
      intent: undefined,
      busy: false,
      failed: true,
      notReady: false,
      failure: "unreachable",
      retry: vi.fn(),
    },
    recoveryNeeded: false,
    unknownReservation: true,
    checkPending: vi.fn(),
    discardPending: vi.fn(),
  } as unknown as ComponentProps<typeof ConversationHistoryStatus>["session"];
  const html = renderToStaticMarkup(
    createElement(ConversationHistoryStatus, { session }),
  ).replace(/&#x27;/g, "'");
  expect(html).toContain("Your last message may still be in progress.");
  const discard = buttons.find(
    (item) => item.children === "Discard and write a new message",
  );
  expect(discard).toBeDefined();
  discard!.onClick();
  expect(session.discardPending).toHaveBeenCalledExactlyOnceWith();
  expect(session.checkPending).not.toHaveBeenCalled();
  buttons.find((item) => item.children === "Check again")!.onClick();
  expect(session.checkPending).toHaveBeenCalledExactlyOnceWith();

  // Discarding releases the retained message and its text; nothing is sent.
  const discarded = vi.fn();
  expect(await command.discard(nextBinding.runId, discarded)).toBe(true);
  expect(discarded).toHaveBeenCalledExactlyOnceWith(prompt);
  expect(journal(cache).read()).toBeUndefined();
  expect(stored(storage)).not.toContain(prompt);
});

it("a successful send clears the persisted text", async () => {
  // The captured box text and the retained next message are the only persisted copies.
  const draft = createInitialDraftOwner(scope, storage);
  draft.edit(prompt);
  const target = { ...nextBinding, selectedClientId: clientId };
  const request = { requestId: nextRequestId, prompt };
  draft.begin(target, request, prompt);
  const cache = new QueryClient();
  journal(cache).start(binding, prompt, nextRequestId);
  expect(stored(storage)).toContain(prompt);

  expect(
    draft.acknowledge(target, { ...request, state: "observed" }, prompt),
  ).toBe(true);
  const completed = turn(nextBinding, nextRequestId, prompt, 2, 2);
  const page = await transport.readConversationTranscript(
    { conversationId: binding.conversationId, after: 2, limit: 100 },
    new AbortController().signal,
    async () =>
      Response.json({
        schema: "meri.conversation-transcript/1",
        conversation,
        latestRun: completed.run,
        latestSequenceBase: 2,
        turns: [completed],
        events: [
          event(1, "Answer", nextBinding),
          status(2, "completed", nextBinding),
        ].map((item, index) => ({ sequence: index + 3, event: item })),
        nextSequence: 4,
        lastSequence: 4,
        hasMore: false,
        pendingTurn: null,
      }),
  );
  if (transport.isEmptyTranscript(page))
    throw new Error("Expected populated successful-send transcript fixture");
  expect(journal(cache).acknowledgeCompleted(page)).toBe(true);
  expect(draft.draft()).toBe("");
  expect(stored(storage)).not.toContain(prompt);
});
