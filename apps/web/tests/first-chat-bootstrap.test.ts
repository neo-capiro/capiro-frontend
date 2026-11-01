import { expect, it, vi } from "vitest";
import { resolveFirstChatConversation } from "../src/shared/meri-conversations/first-chat-bootstrap";
import {
  markFirstChatIntentUsed,
  readFirstChatIntent,
} from "../src/shared/meri-conversations/first-chat-intent";
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

it("reopens an empty confirmed conversation through Core, and starts a new one once it is used or Core refuses it", async () => {
  const storage = memoryStorage();
  const open = (
    createOrReuse: (body: unknown) => Promise<unknown>,
    issueId: () => string,
  ) =>
    resolveFirstChatConversation({
      scope,
      storage,
      signal: new AbortController().signal,
      createOrReuse,
      issueId,
    });
  await open(
    async () => receipt,
    () => requestId,
  );

  // Reload or a second visit before any message: the same request replays to the same conversation.
  const replay = vi.fn(async (body: unknown) => {
    expect(body).toMatchObject({ requestId });
    return receipt;
  });
  expect(
    await open(replay, () => {
      throw new Error("A reopen cannot mint a new UUID");
    }),
  ).toEqual({
    conversationId,
    clientId: scope.clientId,
  });
  expect(replay).toHaveBeenCalledOnce();

  // After its first message the scope opens a new conversation.
  markFirstChatIntentUsed(scope, conversationId, storage);
  const nextRequest = "88888888-8888-4888-8888-888888888888";
  const nextConversation = "66666666-6666-4666-8666-666666666666";
  const create = vi.fn(async (body: unknown) => {
    expect(body).toMatchObject({ requestId: nextRequest });
    return {
      ...receipt,
      requestId: nextRequest,
      conversationId: nextConversation,
    };
  });
  expect(await open(create, () => nextRequest)).toEqual({
    conversationId: nextConversation,
    clientId: scope.clientId,
  });
  expect(create).toHaveBeenCalledOnce();
  expect(readFirstChatIntent(scope, storage)).toMatchObject({
    state: "confirmed",
    requestId: nextRequest,
    conversationId: nextConversation,
  });

  // Core refusing the reopen (409) supersedes the stored conversation with a new request.
  const thirdRequest = "99999999-9999-4999-8999-999999999999";
  const refusedThenCreated = vi.fn(async (body: { requestId: string }) => {
    if (body.requestId === nextRequest)
      throw new CapiroApiError(409, "The record changed.");
    return { ...receipt, requestId: thirdRequest, conversationId };
  });
  expect(await open(refusedThenCreated as never, () => thirdRequest)).toEqual({
    conversationId,
    clientId: scope.clientId,
  });
  expect(refusedThenCreated).toHaveBeenCalledTimes(2);
  expect(readFirstChatIntent(scope, storage)).toMatchObject({
    state: "confirmed",
    requestId: thirdRequest,
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

for (const clientId of [
  scope.clientId,
  "66666666-6666-4666-8666-666666666666",
]) {
  it.each(["tenantId", "actorId", "clientId"] as const)(
    `refuses a changed %s for selected client ${clientId}`,
    async (field) => {
      const current = { ...scope, clientId };
      const storage = memoryStorage();
      await expect(
        resolveFirstChatConversation({
          scope: current,
          storage,
          signal: new AbortController().signal,
          issueId: () => requestId,
          createOrReuse: async () => ({
            ...receipt,
            ...current,
            [field]: "77777777-7777-4777-8777-777777777777",
          }),
        }),
      ).rejects.toThrow();
      expect(readFirstChatIntent(current, storage)?.state).toBe("pending");
    },
  );
  it.each([401, 403])(
    `a revoked client ${clientId} is refused on reopen and keeps the last confirmation: %s`,
    async (status) => {
      const current = { ...scope, clientId };
      const storage = memoryStorage();
      await resolveFirstChatConversation({
        scope: current,
        storage,
        signal: new AbortController().signal,
        issueId: () => requestId,
        createOrReuse: async () => ({ ...receipt, ...current }),
      });
      const denied = new CapiroApiError(status, "Access denied.");
      const replay = vi.fn(async () => {
        throw denied;
      });
      await expect(
        resolveFirstChatConversation({
          scope: current,
          storage,
          signal: new AbortController().signal,
          createOrReuse: replay,
        }),
      ).rejects.toBe(denied);
      expect(replay).toHaveBeenCalledExactlyOnceWith(
        { schemaVersion: 1, requestId, clientId },
        expect.any(AbortSignal),
      );
      expect(readFirstChatIntent(current, storage)).toMatchObject({
        state: "confirmed",
        conversationId,
      });
    },
  );
}
