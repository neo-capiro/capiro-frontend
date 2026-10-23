import { expect, it, vi } from "vitest";
import {
  firstChatScope,
  readFirstChatIntent,
} from "../src/shared/meri-conversations/first-chat-intent";
import { resolveFirstChatConversation } from "../src/shared/meri-conversations/first-chat-bootstrap";
import { managementJournal } from "../src/shared/meri-conversations/management-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import {
  managedConversation,
  managementVersion,
  requireManagementReceipt,
  type ManagedConversation,
  type ManagementRequest,
} from "../src/shared/capiro/operations/meri-conversation-management";
import {
  prepareClientEntry,
  readClientEntry,
  clientEntryHref,
  meriEntry,
} from "../src/shared/meri-entry/descriptor";
import { requireFirstChatCapability } from "../src/shared/capiro/operations/meri-first-chat";
import { bootstrapConversationSession } from "../src/shared/meri-conversations/session";
import { receiveSessionReceipt } from "../src/shared/meri-actions/session-receipt";
import { defineOperation } from "../src/shared/capiro/contracts";
import { firstChatCoreOperation } from "../src/shared/capiro/operations/meri-first-chat";

// Synthetic receipts and browser storage only. No runtime, identity or DB access.
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = { tenantId: id(1), actorId: id(2) },
  conversationId = id(3),
  requestId = id(4),
  clientId = id(5);
const now = Date.parse("2026-10-23T00:00:00.000Z");
function storage() {
  const data = new Map<string, string>();
  const value = {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, text: string) => {
      data.set(key, text);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  } satisfies TabStorage;
  syncMeriTabIdentity(JSON.stringify(account), value);
  return value;
}
const row: ManagedConversation = {
  conversationId,
  scopeKind: "general",
  clientId: null,
  title: "Synthetic owner title",
  status: "active",
  revision: "0",
  updatedAt: new Date(now).toISOString(),
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
};
const request: ManagementRequest = {
  version: managementVersion,
  requestId,
  conversationId,
  expectedRevision: "0",
  operation: "rename",
  title: "Changed title",
};

it("registers only the exact reviewed Core POST paths for default Clerk sessions", () => {
  for (const path of [
    "/clio/conversations/bootstrap-capability",
    "/clio/conversations/management/v1/list",
    "/clio/conversations/management/v1/change",
  ]) {
    expect(() =>
      defineOperation({ ...firstChatCoreOperation, path }),
    ).not.toThrow();
    for (const method of ["GET", "PATCH", "DELETE"] as const)
      expect(() =>
        defineOperation({ ...firstChatCoreOperation, path, method }),
      ).toThrow();
    expect(() =>
      defineOperation({
        ...firstChatCoreOperation,
        path,
        service: "workspace",
      }),
    ).toThrow();
    for (const neighbor of [
      path + "/extra",
      path + "-other",
      path.replace("/clio/", "/other/"),
    ])
      expect(() =>
        defineOperation({ ...firstChatCoreOperation, path: neighbor }),
      ).toThrow();
  }
});

it("requires explicit General, preserves one bootstrap key after loss, and validates the returned owner", async () => {
  expect(() => firstChatScope.parse({ ...account, clientId: null })).toThrow();
  const scope = { ...account, scopeKind: "general" as const, clientId: null },
    store = storage();
  const controller = new AbortController();
  const invoke = (createOrReuse: (body: unknown) => Promise<unknown>) =>
    resolveFirstChatConversation({
      scope,
      storage: store,
      signal: controller.signal,
      issueId: () => requestId,
      createOrReuse,
    });
  await expect(
    invoke(async () => {
      throw Error("response lost");
    }),
  ).rejects.toThrow();
  const create = vi.fn(async (_body?: unknown) => ({
    schemaVersion: 2,
    requestId,
    conversationId,
    ...account,
    scopeKind: "general",
    clientId: null,
  }));
  expect(await invoke(create)).toEqual({ conversationId, clientId: null });
  expect(create.mock.calls[0]?.[0]).toEqual({
    schemaVersion: 2,
    requestId,
    scopeKind: "general",
    clientId: null,
  });
  expect(readFirstChatIntent(scope, store)?.requestId).toBe(requestId);
  await expect(
    invoke(async () => ({ ...(await create()), actorId: id(9) })),
  ).rejects.toThrow();
});

it("accepts only the exact management receipt, including next revision and immutable scope", () => {
  const receipt = {
    version: managementVersion,
    requestId,
    conversation: { ...row, revision: "1", title: "Changed title" },
  };
  expect(requireManagementReceipt(receipt, request, row)).toEqual(receipt);
  for (const mutation of [
    { revision: "0" },
    { title: "False success" },
    { conversationId: id(9) },
    { scopeKind: "client", clientId },
    { status: "archived", archivedAt: new Date(now).toISOString() },
  ])
    expect(() =>
      requireManagementReceipt(
        { ...receipt, conversation: { ...receipt.conversation, ...mutation } },
        request,
        row,
      ),
    ).toThrow();
  expect(() =>
    requireManagementReceipt({ ...receipt, requestId: id(9) }, request, row),
  ).toThrow();
  expect(() =>
    managedConversation.parse({
      ...row,
      status: "trashed",
      trashedAt: new Date(now).toISOString(),
      restoreUntil: new Date(now + 31 * 86400000).toISOString(),
    }),
  ).toThrow();
});

it("retains exact mutation retry identity and refuses another scope or stale identity generation", () => {
  const store = storage(),
    scope = { ...account, clientId: null, conversationId };
  const journal = managementJournal(scope, store);
  journal.write({ request, previous: row });
  expect(managementJournal(scope, store).read()).toEqual({
    request,
    previous: row,
  });
  expect(
    managementJournal({ ...scope, conversationId: id(9) }, store).read(),
  ).toBeUndefined();
  expect(() =>
    journal.write({
      request: { ...request, expectedRevision: "4" },
      previous: row,
    }),
  ).toThrow();
  syncMeriTabIdentity(JSON.stringify({ ...account, actorId: id(9) }), store);
  expect(() => journal.read()).toThrow();
  expect(() => journal.write({ request, previous: row })).toThrow();
});

it("typed client entry is navigation only, verifies freshness, and keeps the same intent on a double click", () => {
  const scope = { ...account, clientId },
    store = storage();
  const capability = {
    schemaVersion: 1,
    capability: "conversation.bootstrap.v2",
    ...scope,
    checkedAtMs: now,
    expiresAtMs: now + 30000,
  };
  let counter = 10;
  const first = prepareClientEntry(
    scope,
    capability,
    store,
    now,
    () => id(counter++),
    "command-palette",
  );
  expect(first.source).toBe("command-palette");
  expect(
    prepareClientEntry(scope, capability, store, now, () => {
      throw Error("must reuse");
    }),
  ).toEqual(first);
  expect(readClientEntry(scope, first.entryId, store, now + 1)).toEqual(first);
  expect(clientEntryHref(first)).not.toMatch(/prompt|credential|message/);
  expect(() => meriEntry.parse({ ...first, prompt: "auto-send" })).toThrow();
  expect(() =>
    readClientEntry(scope, first.entryId, store, now + 300000),
  ).toThrow();
  expect(() =>
    requireFirstChatCapability(capability, { ...scope, actorId: id(9) }, now),
  ).toThrow();
  expect(() =>
    requireFirstChatCapability(capability, scope, now + 30000),
  ).toThrow();
});

it("General conversation sessions require a bound conversation and cannot enter the client-only action receiver", async () => {
  const value = {
    credential: `action_session_${"a".repeat(43)}`,
    expiresAtMs: now + 60000,
    context: {
      ...account,
      conversationId,
      runId: id(6),
      selectedClientId: null,
    },
  };
  const fetcher = vi.fn(
    async () =>
      new Response(JSON.stringify(value), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  const signal = new AbortController().signal;
  expect(
    await bootstrapConversationSession(
      { clientId: null, conversationId },
      account,
      signal,
      fetcher,
      () => now,
    ),
  ).toEqual(value);
  await expect(
    bootstrapConversationSession(
      { clientId: null },
      account,
      signal,
      fetcher,
      () => now,
    ),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(() => receiveSessionReceipt(JSON.stringify(value), now)).toThrow();
  await expect(
    bootstrapConversationSession(
      { clientId, conversationId },
      account,
      signal,
      fetcher,
      () => now,
    ),
  ).rejects.toThrow();
});
