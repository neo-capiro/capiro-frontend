import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { TabStorage } from "../src/shared/meri-conversations/tab-journal";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";

const marker = "capiro-meri-tab-identity-v1";
const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-native-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
};
const account = { tenantId: context.tenantId, actorId: context.actorId };
const scope = {
  ...account,
  clientId: context.selectedClientId,
  conversationId: context.conversationId,
};
const request = {
  requestId: "60000000-0000-4000-8000-000000000001",
  prompt: "Private immutable input",
  state: "pending" as const,
};
function memoryStorage() {
  const data = new Map<string, string>();
  let ignoreIdentityWrites = false;
  return {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (!ignoreIdentityWrites || key !== marker) data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    ignoreIdentityWrites: () => {
      ignoreIdentityWrites = true;
    },
  } satisfies TabStorage & { ignoreIdentityWrites(): void };
}
async function freshPage() {
  vi.resetModules();
  return {
    tab: await import("../src/shared/meri-conversations/tab-journal"),
    query: await import("../src/shared/meri-conversations/query-journal"),
    turn: await import("../src/shared/meri-conversations/turn-journal"),
    command: await import("../src/features/meri/conversation/run-commands"),
  };
}
function recordKey(storage: TabStorage) {
  return Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).find((key) => key?.startsWith("capiro-meri-chat-v1:"))!;
}

it("a fresh loading page cannot use a persisted identity marker or dispatch before identity sync", async () => {
  const storage = memoryStorage();
  const oldPage = await freshPage();
  oldPage.tab.syncMeriTabIdentity("session-a", storage);
  oldPage.query
    .conversationIntentJournal(new QueryClient(), context, storage)
    .write({ submit: request });
  const key = recordKey(storage),
    saved = storage.getItem(key);
  const page = await freshPage();
  expect(page.tab.meriTabStorageReady(storage)).toBe(false);
  expect(() => page.tab.requireMeriTabStorage(storage)).toThrow(
    page.tab.TabJournalUnavailable,
  );
  const blocked = page.query.conversationIntentJournal(
    new QueryClient(),
    context,
    storage,
  );
  expect(blocked.recoveryBlocked).toBe(true);
  expect(blocked.read()).toEqual({});
  const submit = vi.fn();
  await expect(
    page.command.sendRequest(
      { submit } as unknown as MeriConversationPort,
      blocked,
      "Replacement",
      false,
    ),
  ).rejects.toThrow();
  expect(submit).not.toHaveBeenCalled();
  const turn = page.turn.conversationTurnJournal(
    new QueryClient(),
    account,
    scope.clientId,
    scope.conversationId,
    storage,
  );
  const reserve = vi.fn();
  await expect(
    page.turn.recoverConversationTurn(turn, reserve),
  ).rejects.toThrow();
  expect(reserve).not.toHaveBeenCalled();
  expect(() =>
    page.query.conversationSelectionOwner(
      new QueryClient(),
      account,
      scope.clientId,
      scope.conversationId,
      storage,
    ),
  ).toThrow();
  // Loading checks do not mean signout: retained content is still there, but inaccessible.
  expect(storage.getItem(key)).toBe(saved);
  expect(storage.getItem(marker)).toBe("session-a");
  page.tab.syncMeriTabIdentity("session-a", storage);
  expect(page.tab.requireMeriTabStorage(storage)).toBe(storage);
  expect(
    page.query
      .conversationIntentJournal(new QueryClient(), context, storage)
      .read().submit,
  ).toEqual({ ...request, state: "unknown" });
});

it("a public-route reload followed by a different sign-in purges old recovery before any hydration", async () => {
  const storage = memoryStorage();
  const oldPage = await freshPage();
  oldPage.tab.syncMeriTabIdentity("session-a", storage);
  oldPage.query
    .conversationIntentJournal(new QueryClient(), context, storage)
    .write({ submit: request });
  storage.setItem("unrelated", "keep");
  const key = recordKey(storage);
  const publicPage = await freshPage();
  expect(publicPage.tab.meriTabStorageReady(storage)).toBe(false);
  expect(storage.getItem(key)).not.toBeNull();
  const reading = vi.spyOn(storage, "getItem");
  publicPage.tab.syncMeriTabIdentity("session-b", storage);
  expect(reading.mock.calls.every(([found]) => found === marker)).toBe(true);
  expect(storage.getItem(key)).toBeNull();
  expect(storage.getItem("unrelated")).toBe("keep");
  expect(
    publicPage.query
      .conversationIntentJournal(new QueryClient(), context, storage)
      .read(),
  ).toEqual({});
  expect(
    publicPage.query
      .conversationIntentJournal(
        new QueryClient(),
        { ...context, actorId: "other-native-actor" },
        storage,
      )
      .read(),
  ).toEqual({});
});

it("changed or unconfirmed identity markers close persistent readers and writers", async () => {
  const storage = memoryStorage();
  const page = await freshPage();
  page.tab.syncMeriTabIdentity("session-a", storage);
  const journal = page.query.conversationIntentJournal(
    new QueryClient(),
    context,
    storage,
  );
  journal.write({ submit: request });
  storage.setItem(marker, "different-session");
  expect(page.tab.meriTabStorageReady(storage)).toBe(false);
  expect(journal.current()).toBe(false);
  expect(journal.read()).toEqual({});
  expect(() => journal.write({ submit: request })).toThrow(
    page.tab.TabJournalUnavailable,
  );
  storage.ignoreIdentityWrites();
  expect(() => page.tab.syncMeriTabIdentity("session-b", storage)).toThrow(
    page.tab.TabJournalUnavailable,
  );
  expect(page.tab.meriTabStorageReady(storage)).toBe(false);
  expect(() => page.tab.requireMeriTabStorage(storage)).toThrow(
    page.tab.TabJournalUnavailable,
  );
});
