import { expect, it, vi } from "vitest";
import {
  canBeginNewChatAfterConflict,
  resolveFirstChatConversation,
} from "../src/shared/meri-conversations/first-chat-bootstrap";
import { readFirstChatIntent } from "../src/shared/meri-conversations/first-chat-intent";
import { CapiroApiError } from "../src/shared/capiro/http";

const scope = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
  clientId: "33333333-3333-4333-8333-333333333333",
};
const requestId = "44444444-4444-4444-8444-444444444444";
const conversationId = "55555555-5555-4555-8555-555555555555";
const receipt = {
  schemaVersion: 1,
  requestId,
  conversationId,
  ...scope,
};

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
}

it("persists the exact request before Core and confirms only its matching receipt", async () => {
  const storage = memoryStorage();
  const createOrReuse = vi.fn(async (body: unknown) => {
    expect(body).toEqual({
      schemaVersion: 1,
      requestId,
      clientId: scope.clientId,
    });
    expect(readFirstChatIntent(scope, storage)).toMatchObject({
      state: "pending",
      requestId,
    });
    return receipt;
  });
  const resolved = await resolveFirstChatConversation({
    scope,
    storage,
    signal: new AbortController().signal,
    createOrReuse,
    issueId: () => requestId,
  });
  expect(resolved).toEqual({ conversationId, clientId: scope.clientId });
  expect(readFirstChatIntent(scope, storage)).toMatchObject({
    state: "confirmed",
    requestId,
    conversationId,
  });
});

it("leaves a lost response pending and replays the same ID on retry", async () => {
  const storage = memoryStorage();
  const controller = new AbortController();
  let deliver!: (value: typeof receipt) => void;
  const delayed = new Promise<typeof receipt>((resolve) => {
    deliver = resolve;
  });
  const first = resolveFirstChatConversation({
    scope,
    storage,
    signal: controller.signal,
    createOrReuse: async () => delayed,
    issueId: () => requestId,
  });
  controller.abort();
  deliver(receipt);
  await expect(first).rejects.toMatchObject({ name: "AbortError" });
  expect(readFirstChatIntent(scope, storage)).toMatchObject({
    state: "pending",
    requestId,
  });

  const replay = vi.fn(async (body: unknown) => {
    expect(body).toMatchObject({ requestId });
    return receipt;
  });
  expect(
    await resolveFirstChatConversation({
      scope,
      storage,
      signal: new AbortController().signal,
      createOrReuse: replay,
      issueId: () => {
        throw new Error("A retry cannot mint a new UUID");
      },
    }),
  ).toEqual({ conversationId, clientId: scope.clientId });
  expect(replay.mock.calls[0]![0]).toMatchObject({ requestId });
});

it("rechecks a stored confirmation with Core and refuses a changed conversation", async () => {
  const storage = memoryStorage();
  await resolveFirstChatConversation({
    scope,
    storage,
    signal: new AbortController().signal,
    createOrReuse: async () => receipt,
    issueId: () => requestId,
  });

  await expect(
    resolveFirstChatConversation({
      scope,
      storage,
      signal: new AbortController().signal,
      createOrReuse: async () => ({
        ...receipt,
        conversationId: "66666666-6666-4666-8666-666666666666",
      }),
    }),
  ).rejects.toThrow();
  expect(readFirstChatIntent(scope, storage)).toMatchObject({
    state: "confirmed",
    conversationId,
  });
});

it("holds a foreign receipt or invalid native account before Meri can connect", async () => {
  const storage = memoryStorage();
  await expect(
    resolveFirstChatConversation({
      scope,
      storage,
      signal: new AbortController().signal,
      createOrReuse: async () => ({
        ...receipt,
        tenantId: "77777777-7777-4777-8777-777777777777",
      }),
      issueId: () => requestId,
    }),
  ).rejects.toThrow();
  expect(readFirstChatIntent(scope, storage)?.state).toBe("pending");

  const createOrReuse = vi.fn(async () => receipt);
  await expect(
    resolveFirstChatConversation({
      scope: { ...scope, actorId: "not-a-core-uuid" },
      storage,
      signal: new AbortController().signal,
      createOrReuse,
    }),
  ).rejects.toThrow();
  expect(createOrReuse).not.toHaveBeenCalled();
});

it("offers explicit New Chat only after a confirmed Core 409", async () => {
  const storage = memoryStorage();
  const conflict = new CapiroApiError(409, "The record changed.");
  expect(canBeginNewChatAfterConflict(conflict, scope, () => storage)).toBe(
    false,
  );
  const pending = resolveFirstChatConversation({
    scope,
    storage,
    signal: new AbortController().signal,
    createOrReuse: async () => {
      throw conflict;
    },
    issueId: () => requestId,
  });
  await expect(pending).rejects.toBe(conflict);
  expect(canBeginNewChatAfterConflict(conflict, scope, () => storage)).toBe(
    false,
  );
  await resolveFirstChatConversation({
    scope,
    storage,
    signal: new AbortController().signal,
    createOrReuse: async () => receipt,
  });
  expect(canBeginNewChatAfterConflict(conflict, scope, () => storage)).toBe(
    true,
  );
  expect(
    canBeginNewChatAfterConflict(
      new CapiroApiError(503, "Unavailable"),
      scope,
      () => storage,
    ),
  ).toBe(false);
  expect(
    canBeginNewChatAfterConflict(conflict, scope, () => ({
      getItem: () => {
        throw new Error("storage denied");
      },
      setItem: () => undefined,
    })),
  ).toBe(false);
  expect(
    canBeginNewChatAfterConflict(conflict, scope, () => {
      throw new Error("sessionStorage getter denied");
    }),
  ).toBe(false);
});
