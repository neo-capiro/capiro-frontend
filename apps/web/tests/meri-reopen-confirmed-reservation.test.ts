import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationTurn } from "../src/features/meri/conversation/useConversationTurn";
import { sessionHistoryState } from "../src/features/meri/conversation/saved-turns";
import { composerAvailability } from "../src/features/meri/conversation/MeriLiveConversation";
import { ConversationHistoryStatus } from "../src/features/meri/conversation/ConversationHistoryStatus";
import {
  checkConversationTurn,
  conversationTurnJournal,
} from "../src/shared/meri-conversations/turn-journal";
import {
  discardMeriConversationMessages,
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import * as transport from "../src/shared/meri-conversations/history-client";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import {
  binding,
  nextBinding,
  clientId,
} from "../test/browser/meri-conversation-fixtures";
import { nextRequestId } from "../test/browser/meri-history-fixtures";

// VQA-006: a settled conversation whose next reservation control released reopening the same page
// twice showed the completed answer with "Capiro cannot tell whether your last message was sent", a
// disabled Send, and one Check again that only held for that view. One immutable target per source
// keeps the reservation row after the check, so the saved read reports it again on every page; what
// has to outlive the page is control's own answer that the target admitted no message.
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
/** A reservation minted after the one under test: a new source successor, never the confirmed one. */
const laterBinding = {
  ...nextBinding,
  runId: "40000000-0000-4000-8000-000000000055",
  attemptId: "50000000-0000-4000-8000-000000000077",
  workerId: "60000000-0000-4000-8000-000000000088",
  writerFence: 3,
};
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
const reservedPage = (target = nextBinding) =>
  ({
    turns: [],
    events: [],
    latestRun: { binding, state: "completed" },
    pendingTurn: {
      sourceBinding: binding,
      targetBinding: target,
      state: "RESERVED",
    },
  }) as unknown as transport.ConversationTranscriptPage;
let storage: TabStorage;
beforeEach(() => {
  buttons.length = 0;
  storage = memory();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function journal(cache: QueryClient, actorId = account.actorId) {
  return conversationTurnJournal(
    cache,
    { tenantId: binding.tenantId, actorId },
    clientId,
    binding.conversationId,
    storage,
  );
}
/** One page of this conversation: the hook's own state starts from what this tab kept. */
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
/** A session read of the empty reserved target this page was issued, with the saved answer above it. */
function reservedTargetView(
  target = nextBinding,
  opened: string | undefined = undefined,
) {
  return sessionHistoryState(
    { current: reservedPage(target) },
    target.runId,
    [],
    undefined,
    false,
    undefined,
    opened,
  );
}
function recoveryStatus(
  view: ReturnType<typeof sessionHistoryState>,
  failed = false,
) {
  return {
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
      failed,
      notReady: false,
      failure: undefined,
      retry: vi.fn(),
    },
    recoveryNeeded: view.recoveryNeeded,
    unknownReservation: view.unknownReservation,
    checkPending: vi.fn(),
    discardPending: vi.fn(),
  } as unknown as ComponentProps<typeof ConversationHistoryStatus>["session"];
}
const rendered = (
  session: ComponentProps<typeof ConversationHistoryStatus>["session"],
) =>
  renderToStaticMarkup(
    createElement(ConversationHistoryStatus, { session }),
  ).replace(/&#x27;/g, "'");

it("a reopened settled conversation whose reservation this tab confirmed reopens ready, without the same check again", async () => {
  const cache = new QueryClient();
  const reserve = vi
    .spyOn(transport, "reserveConversationTurn")
    .mockResolvedValue(receipt("RESERVED"));
  const first = mount(cache);
  // Before any check the page reports the reservation the saved read cannot settle: the person is
  // told to check, and Send waits. This is the state QA saw on every visit.
  expect(first.command.opened).toBeUndefined();
  expect(reservedTargetView().unknownReservation).toBe(true);
  expect(rendered(recoveryStatus(reservedTargetView()))).toContain(
    "After reopening this page, Capiro cannot tell whether your last message was sent.",
  );

  const restore = vi.fn();
  expect(await first.command.check(binding, restore)).toBe(true);
  expect(reserve).toHaveBeenCalledExactlyOnceWith(
    { conversationId: binding.conversationId, sourceRunId: binding.runId },
    expect.any(AbortSignal),
  );
  // Control's RESERVED answer is this tab's to keep, for the exact source and target it bound.
  expect(stored(storage)).toContain(nextBinding.runId);
  expect(stored(storage)).toContain(binding.runId);

  // Reopening the same page: no new request, and the same reservation opens instead of a warning.
  const reopened = mount(new QueryClient());
  expect(reserve).toHaveBeenCalledTimes(1);
  expect(reopened.command.opened).toBe(nextBinding.runId);
  const view = reservedTargetView(nextBinding, reopened.command.opened);
  expect(view.unknownReservation).toBe(false);
  expect(view.recoveryNeeded).toBe(false);
  expect(view.nextBlocked).toBeUndefined();
  expect(view.openedTarget).toBe(nextBinding.runId);
  expect(rendered(recoveryStatus(view))).not.toContain(
    "After reopening this page",
  );

  // The reserved target is the session on screen, so an ordinary message may go to it.
  const availability = composerAvailability(
    {
      intent: {},
      busy: false,
      failure: undefined,
      refusal: undefined,
      snapshot: { status: "unavailable", observation: null },
    } as never,
    null,
    [{} as never],
    undefined,
    view.initialBlocked,
    undefined,
    view.nextBlocked,
    false,
    false,
    view.openedTarget === nextBinding.runId,
  );
  expect(availability.resend).toBe(true);
  expect(availability.sendBlocked).toBeUndefined();
});

it("a reservation this tab never confirmed still protects the thread", async () => {
  // Nothing kept at all: the first open of a tab asks, as before.
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  const unconfirmed = reservedTargetView();
  expect(unconfirmed.unknownReservation).toBe(true);
  expect(unconfirmed.source).toBeUndefined();
  const asked = rendered(recoveryStatus(unconfirmed));
  expect(asked).toContain(">Check again<");
  expect(asked).toContain("After reopening this page");

  // A kept confirmation is for one reservation only: a later successor still asks.
  const cache = new QueryClient();
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("RESERVED"),
  );
  expect(await mount(cache).command.check(binding, vi.fn())).toBe(true);
  expect(mount(new QueryClient()).command.opened).toBe(nextBinding.runId);
  const later = reservedTargetView(
    laterBinding,
    mount(new QueryClient()).command.opened,
  );
  expect(later.unknownReservation).toBe(true);
  expect(later.nextBlocked).toBe(
    "Your last message may still be in progress. Check again before sending.",
  );
  expect(rendered(recoveryStatus(later))).toContain(
    "After reopening this page, Capiro cannot tell whether your last message was sent.",
  );
});

it("the confirmation belongs to this tab's exact tenant, actor, client and conversation", async () => {
  const cache = new QueryClient();
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("RESERVED"),
  );
  expect(await mount(cache).command.check(binding, vi.fn())).toBe(true);
  expect(journal(new QueryClient()).openedTarget()).toBe(nextBinding.runId);
  // Another actor's journal of the same conversation, and another conversation's journal, keep none.
  expect(
    journal(
      new QueryClient(),
      "70000000-0000-4000-8000-000000000001",
    ).openedTarget(),
  ).toBeUndefined();
  expect(
    conversationTurnJournal(
      new QueryClient(),
      account,
      "70000000-0000-4000-8000-0000000000c1",
      binding.conversationId,
      storage,
    ).openedTarget(),
  ).toBeUndefined();
  // A replaced sign-in retires the whole tab journal, confirmation included.
  syncMeriTabIdentity("synthetic-other-signed-in", storage);
  expect(journal(new QueryClient()).openedTarget()).toBeUndefined();
});

it("checking again keeps one exact target, and gives up nothing new", async () => {
  const cache = new QueryClient();
  const reserve = vi
    .spyOn(transport, "reserveConversationTurn")
    .mockResolvedValue(receipt("RESERVED"));
  const { command } = mount(cache);
  expect(await command.check(binding, vi.fn())).toBe(true);
  expect(await command.check(binding, vi.fn())).toBe(true);
  expect(reserve).toHaveBeenCalledTimes(2);
  expect(reserve).toHaveBeenNthCalledWith(
    2,
    { conversationId: binding.conversationId, sourceRunId: binding.runId },
    expect.any(AbortSignal),
  );
  const keys = Array.from(
    { length: storage.length },
    (_, i) => storage.key(i)!,
  );
  expect(keys.filter((key) => key.includes('"turn-open"'))).toHaveLength(1);
  expect(journal(new QueryClient()).openedTarget()).toBe(nextBinding.runId);
  expect(mount(new QueryClient()).command.opened).toBe(nextBinding.runId);
});

it("an answer that stays uncertain, an accepted target and an explicit discard record nothing", async () => {
  const uncertain = new QueryClient();
  vi.spyOn(transport, "reserveConversationTurn").mockRejectedValue(
    new transport.ConversationHistoryUnavailable(
      502,
      "CONVERSATION_UNAVAILABLE",
    ),
  );
  const failed = mount(uncertain);
  expect(await failed.command.check(binding, vi.fn())).toBe(false);
  expect(journal(new QueryClient()).openedTarget()).toBeUndefined();
  expect(failed.command.opened).toBeUndefined();

  vi.restoreAllMocks();
  storage = memory();
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("ACCEPTED"),
  );
  const accepted = mount(new QueryClient());
  expect(await accepted.command.check(binding, vi.fn())).toBe(true);
  expect(journal(new QueryClient()).openedTarget()).toBeUndefined();

  vi.restoreAllMocks();
  storage = memory();
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("RESERVED"),
  );
  const cache = new QueryClient();
  expect(await mount(cache).command.check(binding, vi.fn())).toBe(true);
  expect(journal(new QueryClient()).openedTarget()).toBe(nextBinding.runId);
  // The person giving up an uncertain message is not control confirming nothing was admitted: it
  // unlocks this view, and the next page still asks.
  discardMeriConversationMessages(
    { ...account, clientId, conversationId: binding.conversationId },
    storage,
  );
  expect(journal(new QueryClient()).openedTarget()).toBeUndefined();
});

it("a retained message still replays the same target and its text comes back", async () => {
  // The retained intent path writes no duplicated target: it keeps the one control bound.
  conversationTurnJournal(
    new QueryClient(),
    account,
    clientId,
    binding.conversationId,
    storage,
  ).start(binding, prompt, nextRequestId);
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("RESERVED"),
  );
  const restore = vi.fn();
  const { command, open } = mount(new QueryClient());
  expect(await command.check(binding, restore)).toBe(true);
  expect(open).not.toHaveBeenCalled();
  expect(restore).toHaveBeenCalledExactlyOnceWith(prompt);
  expect(journal(new QueryClient()).read()).toBeUndefined();
  expect(journal(new QueryClient()).openedTarget()).toBe(nextBinding.runId);
});

// Revision after independent review: the optional confirmation is a hint that must never fail a
// page, and it only establishes that one target was empty when control answered, so newer work in
// the same journal supersedes it.
const confirmationKey = () =>
  Array.from({ length: storage.length }, (_, i) => storage.key(i)!).find(
    (key) => key.includes('"turn-open"'),
  )!;
async function confirmedOnce() {
  const cache = new QueryClient();
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("RESERVED"),
  );
  expect(await mount(cache).command.check(binding, vi.fn())).toBe(true);
  expect(journal(cache).openedTarget()).toBe(nextBinding.runId);
  return confirmationKey();
}

it("an unreadable optional confirmation asks again instead of failing the page", async () => {
  const key = await confirmedOnce();
  const record = JSON.parse(storage.getItem(key)!);
  // Malformed JSON, a rejected public source, and a denied read of this one record are all the same
  // thing to this page: it cannot say the message was not sent, so it asks control again.
  for (const broken of [
    "{broken",
    JSON.stringify({
      ...record,
      value: {
        ...record.value,
        source: { ...record.value.source, sourceRunId: "invalid" },
      },
    }),
  ]) {
    storage.setItem(key, broken);
    expect(() => mount(new QueryClient())).not.toThrow();
    expect(mount(new QueryClient()).command.opened).toBeUndefined();
  }
  storage.setItem(key, JSON.stringify(record));
  const read = storage.getItem;
  storage.getItem = (k) => {
    if (k.includes('"turn-open"')) throw new Error("denied");
    return read(k);
  };
  expect(() => mount(new QueryClient())).not.toThrow();
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  expect(reservedTargetView().unknownReservation).toBe(true);
});

it("a general journal failure keeps the existing recovery refusal instead of hiding it", () => {
  const read = storage.getItem;
  storage.getItem = () => {
    throw new Error("denied");
  };
  const { command } = mount(new QueryClient());
  expect(command.opened).toBeUndefined();
  // The optional hint never speaks for the journal: a tab that cannot read its own message still
  // reports the ordinary closed recovery the person already had.
  expect(command.storageError).toBeTruthy();
  storage.getItem = read;
});

it("a newer message retires the earlier empty-reservation answer", async () => {
  const cache = new QueryClient();
  await confirmedOnce();
  journal(cache).start(binding, prompt, nextRequestId);
  expect(journal(cache).openedTarget()).toBeUndefined();
  // The next page asks again unless control answers about the newer message.
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
});

it("a failed check followed by an explicit give-up leaves no durable confirmation", async () => {
  const cache = new QueryClient();
  await confirmedOnce();
  journal(cache).start(binding, prompt, nextRequestId);
  vi.spyOn(transport, "reserveConversationTurn").mockRejectedValue(
    new transport.ConversationHistoryUnavailable(
      502,
      "CONVERSATION_UNAVAILABLE",
    ),
  );
  const { command } = mount(cache);
  expect(await command.check(binding, vi.fn())).toBe(false);
  expect(await command.discard(nextBinding.runId, vi.fn())).toBe(true);
  expect(journal(cache).read()).toBeUndefined();
  expect(journal(cache).openedTarget()).toBeUndefined();
  // Giving up in one view is not control settling the message: the next page still reports it.
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  expect(reservedTargetView().unknownReservation).toBe(true);
});

it("control's ACCEPTED answer retires the earlier empty-reservation answer", async () => {
  const cache = new QueryClient();
  await confirmedOnce();
  journal(cache).start(binding, prompt, nextRequestId);
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("ACCEPTED"),
  );
  const { command, open } = mount(cache);
  expect(await command.check(binding, vi.fn())).toBe(true);
  expect(open).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      runId: nextBinding.runId,
      requestId: nextRequestId,
    }),
  );
  expect(journal(cache).openedTarget()).toBeUndefined();
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
});

// Revision after the second review: retirement is only invalidation when it is durable, and an
// ordinary message into the confirmed reserved target is newer than control's answer.
it("a confirmation this tab cannot remove is retired by a verified tombstone, not by a caught error", async () => {
  const key = await confirmedOnce();
  const remove = storage.removeItem;
  storage.removeItem = (k) => {
    if (k.includes('"turn-open"')) throw new Error("synthetic removal denied");
    remove(k);
  };
  const cache = new QueryClient();
  journal(cache).start(binding, prompt, nextRequestId);
  // The newer message superseded it even though the old bytes could not be deleted.
  expect(journal(cache).openedTarget()).toBeUndefined();
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  // The record is still there, and it no longer reads as a confirmation.
  expect(storage.getItem(key)).not.toBeNull();
  expect(JSON.parse(storage.getItem(key)!).value.retired).toBe(true);
  storage.removeItem = remove;
});

it("a removal that leaves the bytes cannot let a later accepted receipt look empty", async () => {
  await confirmedOnce();
  const remove = storage.removeItem;
  storage.removeItem = (k) => {
    if (!k.includes('"turn-open"')) remove(k);
  };
  vi.spyOn(transport, "reserveConversationTurn").mockResolvedValue(
    receipt("ACCEPTED"),
  );
  expect(await mount(new QueryClient()).command.check(binding, vi.fn())).toBe(
    true,
  );
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  storage.removeItem = remove;
});

it("an ordinary message into the confirmed reserved target supersedes the empty answer", async () => {
  await confirmedOnce();
  const commands = conversationIntentJournal(
    new QueryClient(),
    {
      tenantId: nextBinding.tenantId,
      actorId: nextBinding.actorId,
      conversationId: nextBinding.conversationId,
      runId: nextBinding.runId,
      selectedClientId: clientId,
    },
    storage,
  );
  commands.write({
    submit: {
      requestId: "a0000000-0000-4000-8000-00000000000b",
      prompt: "Synthetic reserved-target message",
      state: "unknown",
    },
  });
  // The request journal keeps its own uncertainty; the older empty answer stops settling it.
  expect(commands.read().submit?.state).toBe("unknown");
  expect(journal(new QueryClient()).openedTarget()).toBeUndefined();
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
});

// Revision after the third review: the answer is only as good as the evidence that nothing newer
// exists, and its retirement must not depend on the record it is written in.
const requestKey = () =>
  Array.from({ length: storage.length }, (_, i) => storage.key(i)!).find(
    (key) => key.includes('"request"'),
  )!;
const claimKey = () =>
  Array.from({ length: storage.length }, (_, i) => storage.key(i)!).find(
    (key) => key.includes("open-claim"),
  )!;
async function ordinaryReservedTargetRequest() {
  const commands = conversationIntentJournal(
    new QueryClient(),
    {
      tenantId: nextBinding.tenantId,
      actorId: nextBinding.actorId,
      conversationId: nextBinding.conversationId,
      runId: nextBinding.runId,
      selectedClientId: clientId,
    },
    storage,
  );
  expect(
    commands.write({
      submit: {
        requestId: "a0000000-0000-4000-8000-00000000000b",
        prompt: "Synthetic reserved-target message",
        state: "unknown",
      },
    }),
  ).toBe(true);
  return commands;
}

it("a newer request this tab cannot read makes the confirmation unusable", async () => {
  const key = await confirmedOnce();
  const record = JSON.parse(storage.getItem(key)!);
  const commands = await ordinaryReservedTargetRequest();
  // A retained request settles nothing, even when it cannot be read back.
  const request = requestKey();
  const bytes = storage.getItem(request)!;
  storage.setItem(request, "{broken");
  expect(journal(new QueryClient()).openedTarget()).toBeUndefined();
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  storage.setItem(request, bytes);
  const read = storage.getItem;
  storage.getItem = (k) => {
    if (k.includes('"request"')) throw new Error("denied");
    return read(k);
  };
  expect(journal(new QueryClient()).openedTarget()).toBeUndefined();
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  storage.getItem = read;
  // The canonical request is untouched: it still reads as the unknown submit it was.
  expect(commands.read().submit?.state).toBe("unknown");
  expect(JSON.parse(storage.getItem(key)!).value.source.sourceRunId).toBe(
    binding.runId,
  );
  expect(record).toBeDefined();
});

it("a confirmation this tab can neither rewrite nor delete stays retired for the next page", async () => {
  await confirmedOnce();
  const claim = claimKey();
  const write = storage.setItem;
  const remove = storage.removeItem;
  storage.setItem = (k, v) => {
    if (k.includes('"turn-open"')) throw new Error("synthetic write denied");
    write(k, v);
  };
  storage.removeItem = (k) => {
    if (k.includes('"turn-open"')) throw new Error("synthetic removal denied");
    remove(k);
  };
  const cache = new QueryClient();
  journal(cache).start(binding, prompt, nextRequestId);
  expect(journal(cache).discard()).toBeDefined();
  // The answer record is still readable, and its own durable claim retires it for a later owner.
  expect(storage.getItem(confirmationKey())).not.toBeNull();
  expect(JSON.parse(storage.getItem(claim)!).value.state).toBe("retired");
  expect(journal(new QueryClient()).openedTarget()).toBeUndefined();
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  storage.setItem = write;
  storage.removeItem = remove;
});

// Revision after the fourth review: retirement must survive a write-only failure using the removal
// that still works, and an unconfirmed conversation must not leave optional records behind.
it("a storage that cannot write but can remove still retires the answer", async () => {
  await journal(new QueryClient()).confirmOpened({
    sourceBinding: binding,
    targetBinding: nextBinding,
  });
  expect(mount(new QueryClient()).command.opened).toBe(nextBinding.runId);
  const write = storage.setItem;
  storage.setItem = () => {
    throw new DOMException("Synthetic quota", "QuotaExceededError");
  };
  expect(
    await checkConversationTurn(journal(new QueryClient()), binding, async () =>
      receipt("ACCEPTED"),
    ),
  ).not.toBeUndefined();
  expect(mount(new QueryClient()).command.opened).toBeUndefined();
  storage.setItem = write;
});

it("an optional claim never crowds the bounded journal for conversations that were not confirmed", () => {
  const storageBefore = storage.length;
  for (let index = 1; index <= 130; index += 1) {
    const source = {
      ...binding,
      conversationId: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    };
    const owner = conversationTurnJournal(
      new QueryClient(),
      account,
      clientId,
      source.conversationId,
      storage,
    );
    expect(
      () => owner.start(source, prompt, nextRequestId),
      `conversation ${index}`,
    ).not.toThrow();
    owner.discard();
  }
  // Nothing is left behind: no optional record, and no unresolved command either.
  expect(storage.length).toBe(storageBefore);
  expect(
    Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter(
      (key) => key.startsWith("capiro-meri-chat-v1:"),
    ),
  ).toEqual([]);
});
