/** A long-lived tab keeps saving: settled records make room at the record budget, oldest first; unresolved
 * records, drafts holding a selection and each conversation's current-run request never do. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  syncMeriTabIdentity,
  tabRecord,
  TabJournalUnavailable,
  type TabScope,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { contextInScope } from "../src/features/meri/conversation/useConversationLocalState";
import { QueryClient } from "@tanstack/react-query";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = (n: number): TabScope => ({
  tenantId: id(1),
  actorId: id(2),
  clientId: id(3),
  conversationId: id(1000 + n),
});
const pass = (value: unknown) => value;
const emptyDraft = { draft: "", revision: 0, pending: null, reserved: null };
let clock = 1_800_000_000_000;
beforeEach(() => {
  vi.spyOn(Date, "now").mockImplementation(() => ++clock);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function memory(): TabStorage {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  syncMeriTabIdentity("session-a", storage);
  return storage;
}
const request = (storage: TabStorage, conversation: number, run: number) =>
  tabRecord(scope(conversation), "request", pass, id(5000 + run), storage);
/** Finished runs, the way the run journal leaves them: 32 runs in each of four conversations (128). */
const fill = (storage: TabStorage, state: "observed" | "pending") => {
  for (let run = 0; run < 128; run++)
    request(storage, run % 4, run).write({
      submit: { requestId: id(9000 + run), state },
    });
};
const keys = (storage: TabStorage) =>
  Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => !!key?.startsWith("capiro-meri-chat-v1:"),
  );
const has = (storage: TabStorage, conversation: number, run: number) =>
  keys(storage).some(
    (key) =>
      key.includes(id(1000 + conversation)) && key.includes(id(5000 + run)),
  );

it("a new run's request is recorded in a full tab, mid-run, without the recovery warning", () => {
  const storage = memory();
  fill(storage, "observed");
  const current = request(storage, 9, 300);
  // Creating the in-flight run's record is the save that threw at the budget; the replace that follows must hold too.
  current.write({ submit: { requestId: id(7301), state: "pending" } });
  current.write({ submit: { requestId: id(7301), state: "observed" } });
  expect(current.read()).toEqual({
    submit: { requestId: id(7301), state: "observed" },
  });
  expect(current.current()).toBe(true);
  expect(keys(storage)).toHaveLength(128);
  // The oldest settled record made room; every conversation's current-run request stays.
  expect(has(storage, 0, 0)).toBe(false);
  for (const [conversation, run] of [[0, 124], [1, 125], [2, 126], [3, 127]] as const)
    expect(has(storage, conversation, run)).toBe(true);
});

it("each conversation's current-run request is kept even when it is the oldest settled record", () => {
  const storage = memory();
  request(storage, 50, 1).write({ submit: { requestId: id(9500), state: "observed" } });
  for (let run = 0; run < 127; run++)
    request(storage, 51, 100 + run).write({
      submit: { requestId: id(9600 + run), state: "observed" },
    });
  request(storage, 52, 400).write({ submit: { requestId: id(9900), state: "pending" } });
  expect(has(storage, 50, 1)).toBe(true);
  expect(has(storage, 51, 100)).toBe(false);
});

it("unresolved requests, unsent drafts and drafts holding a selection are never evicted", () => {
  const storage = memory();
  fill(storage, "pending");
  expect(() =>
    tabRecord(scope(200), "draft", pass, "", storage).write({ ...emptyDraft, draft: "next", revision: 1 }),
  ).toThrow(TabJournalUnavailable);

  const selected = memory();
  for (let n = 0; n < 128; n++)
    tabRecord(scope(n), "draft", pass, "", selected).write({
      ...emptyDraft,
      selection: { skill: { id: "meri-bill-watch" } },
    });
  expect(() =>
    tabRecord(scope(300), "draft", pass, "", selected).write({ ...emptyDraft, draft: "next", revision: 1 }),
  ).toThrow(TabJournalUnavailable);
  expect(keys(selected)).toHaveLength(128);

  const cleared = memory();
  for (let n = 0; n < 128; n++)
    tabRecord(scope(n), "draft", pass, "", cleared).write({ ...emptyDraft, selection: {} });
  tabRecord(scope(300), "draft", pass, "", cleared).write({ ...emptyDraft, draft: "next", revision: 1 });
  expect(keys(cleared)).toHaveLength(128);
});

it("records written before the write time existed still read", () => {
  const storage = memory();
  const record = tabRecord(scope(1), "draft", pass, "", storage);
  record.write({ ...emptyDraft, draft: "kept", revision: 1 });
  const name = keys(storage)[0]!;
  const legacy = JSON.parse(storage.getItem(name)!);
  delete legacy.at;
  storage.setItem(name, JSON.stringify(legacy));
  expect(record.read()).toEqual({ ...emptyDraft, draft: "kept", revision: 1 });
});

it("a context from another scope is skipped by the draft owner, never treated as a storage failure", () => {
  const owned = scope(1),
    context = {
      tenantId: owned.tenantId,
      actorId: owned.actorId,
      selectedClientId: owned.clientId,
      conversationId: owned.conversationId,
      runId: id(7),
    };
  expect(contextInScope(context as never, owned)).toBe(true);
  expect(contextInScope({ ...context, selectedClientId: null } as never, owned)).toBe(false);
  expect(contextInScope({ ...context, conversationId: id(8) } as never, owned)).toBe(false);
  expect(contextInScope(context as never, undefined)).toBe(true);
});

// 2 Nov preview: "THIS TAB COULD NOT SAFELY SAVE OR RECOVER THE MESSAGE" after a long day in one tab. The run
// journal's own receiver stored every request as "unknown", so no finished run's record ever counted as settled
// and none could make room: the 129th run's record (and every later save) failed. The fill above writes through a
// pass-through receiver and did not see it; this one writes through the actual run journal.
it("finished runs written through the actual run journal make room for a new run's request", () => {
  const storage = memory();
  const cache = new QueryClient();
  const journal = (conversation: number, run: number) =>
    conversationIntentJournal(
      cache,
      {
        tenantId: id(1),
        actorId: id(2),
        selectedClientId: id(3),
        conversationId: id(1000 + conversation),
        runId: id(5000 + run),
      },
      storage,
    );
  const submit = (run: number, state: "pending" | "observed") => ({
    requestId: id(9000 + run),
    prompt: `Message ${run}`,
    state,
  });
  for (let run = 0; run < 128; run++) {
    const owner = journal(run % 4, run);
    owner.write({ submit: submit(run, "pending") });
    owner.write({ submit: submit(run, "observed") });
  }
  const next = journal(9, 300);
  expect(() => next.write({ submit: submit(300, "pending") })).not.toThrow();
  expect(keys(storage)).toHaveLength(128);
  // A reload still reads a stored request as unknown until server history resolves it.
  expect(journal(9, 300).read().submit?.state).toBe("unknown");
  expect(
    conversationIntentJournal(
      new QueryClient(),
      {
        tenantId: id(1),
        actorId: id(2),
        selectedClientId: id(3),
        conversationId: id(1003),
        runId: id(5127),
      },
      storage,
    ).read().submit,
  ).toMatchObject({ requestId: id(9127), state: "unknown" });
  cache.clear();
});
