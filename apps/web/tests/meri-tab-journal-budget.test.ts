/** A long-lived tab keeps saving: settled records make room at the record budget, unresolved ones never do. */
import { expect, it } from "vitest";
import {
  syncMeriTabIdentity,
  tabRecord,
  TabJournalUnavailable,
  type TabScope,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = (n: number): TabScope => ({
  tenantId: id(1),
  actorId: id(2),
  clientId: id(3),
  conversationId: id(1000 + n),
});
const pass = (value: unknown) => value;

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
/** One request record per finished run, the way the run journal leaves them. */
const fill = (storage: TabStorage, state: "observed" | "pending") => {
  for (let n = 0; n < 127; n++)
    tabRecord(scope(n), "request", pass, id(5000 + n), storage).write({
      submit: { requestId: id(9000 + n), state },
    });
};
const records = (storage: TabStorage) =>
  Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key) => key?.startsWith("capiro-meri-chat-v1:"),
  ).length;

it("a tab whose earlier runs filled the record budget still saves the next message", () => {
  const storage = memory();
  fill(storage, "observed");
  const draft = tabRecord(scope(200), "draft", pass, "", storage);
  draft.write({ draft: "next", revision: 1, pending: null, reserved: null });
  tabRecord(scope(201), "draft", pass, "", storage).write({
    draft: "another",
    revision: 1,
    pending: null,
    reserved: null,
  });
  expect(draft.read()).toEqual({
    draft: "next",
    revision: 1,
    pending: null,
    reserved: null,
  });
  expect(records(storage)).toBeLessThanOrEqual(128);
});

it("unresolved requests and unsent drafts are never evicted to make room", () => {
  const storage = memory();
  fill(storage, "pending");
  tabRecord(scope(200), "draft", pass, "", storage).write({
    draft: "unsent",
    revision: 1,
    pending: null,
    reserved: null,
  });
  expect(() =>
    tabRecord(scope(201), "draft", pass, "", storage).write({
      draft: "next",
      revision: 1,
      pending: null,
      reserved: null,
    }),
  ).toThrow(TabJournalUnavailable);
  expect(records(storage)).toBe(128);
});

it("a context from another scope is skipped by the draft owner, never treated as a storage failure", async () => {
  const { contextInScope } = await import(
    "../src/features/meri/conversation/useConversationLocalState"
  );
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

it("the in-flight run's own request save succeeds at the budget, so no recovery warning appears mid-run", () => {
  const storage = memory();
  fill(storage, "observed");
  const current = tabRecord(scope(300), "request", pass, id(7300), storage);
  // Submit records the pending request, then the observed one while the run is still answering.
  current.write({ submit: { requestId: id(7301), state: "pending" } });
  current.write({ submit: { requestId: id(7301), state: "observed" } });
  expect(current.read()).toEqual({
    submit: { requestId: id(7301), state: "observed" },
  });
  expect(current.current()).toBe(true);
  expect(records(storage)).toBeLessThanOrEqual(128);
});
