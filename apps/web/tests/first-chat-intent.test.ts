import { expect, it } from "vitest";
import {
  confirmFirstChatIntent,
  FirstChatIntentStorageError,
  markFirstChatIntentUsed,
  readFirstChatIntent,
  reserveFirstChatIntent,
  type FirstChatScope,
} from "../src/shared/meri-conversations/first-chat-intent";

const scope: FirstChatScope = {
  tenantId: "tenant-a",
  actorId: "actor-a",
  clientId: "11111111-1111-4111-8111-111111111111",
};
const requestA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const requestB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const conversationA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem(key: string) {
      return entries.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      entries.set(key, value);
    },
  };
}

it("persists one first-chat request identity before retrying after a lost response or reload", () => {
  const storage = memoryStorage();
  const first = reserveFirstChatIntent(scope, storage, () => requestA);

  expect(first).toMatchObject({ state: "pending", requestId: requestA, scope });
  expect(storage.entries.size).toBe(1);
  expect(readFirstChatIntent(scope, storage)).toEqual(first);
  expect(
    reserveFirstChatIntent(scope, storage, () => {
      throw new Error("A retry must not generate a new request ID");
    }),
  ).toEqual(first);
});

it("reopens a confirmed conversation until it is used, then the next opening is a new request", () => {
  const storage = memoryStorage();
  reserveFirstChatIntent(scope, storage, () => requestA);
  const confirmed = confirmFirstChatIntent(
    scope,
    requestA,
    conversationA,
    storage,
  );

  expect(confirmed).toMatchObject({
    state: "confirmed",
    requestId: requestA,
    conversationId: conversationA,
  });
  expect(
    confirmFirstChatIntent(scope, requestA, conversationA, storage),
  ).toEqual(confirmed);
  // Reload, a second visit or New conversation while it is still empty: the same conversation.
  expect(reserveFirstChatIntent(scope, storage, () => requestB)).toEqual(
    confirmed,
  );
  markFirstChatIntentUsed(
    scope,
    "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    storage,
  );
  expect(reserveFirstChatIntent(scope, storage, () => requestB)).toEqual(
    confirmed,
  );
  markFirstChatIntentUsed(scope, conversationA, storage);
  expect(readFirstChatIntent(scope, storage)).toEqual({
    ...confirmed,
    used: true,
  });
  expect(reserveFirstChatIntent(scope, storage, () => requestB)).toMatchObject({
    state: "pending",
    requestId: requestB,
  });
  expect(readFirstChatIntent(scope, storage)?.requestId).toBe(requestB);
});

it("marking a pending or absent intent used changes nothing and never throws", () => {
  const storage = memoryStorage();
  markFirstChatIntentUsed(scope, conversationA, storage);
  expect(storage.entries.size).toBe(0);
  reserveFirstChatIntent(scope, storage, () => requestA);
  markFirstChatIntentUsed(scope, conversationA, storage);
  expect(readFirstChatIntent(scope, storage)?.state).toBe("pending");
  markFirstChatIntentUsed(scope, conversationA, {
    getItem: () => {
      throw new Error("storage denied");
    },
    setItem: () => undefined,
  });
});

it("holds an unresolved request instead of silently rotating its identity", () => {
  const storage = memoryStorage();
  reserveFirstChatIntent(scope, storage, () => requestA);

  expect(reserveFirstChatIntent(scope, storage, () => requestB)).toMatchObject({
    state: "pending",
    requestId: requestA,
  });
  expect(readFirstChatIntent(scope, storage)?.requestId).toBe(requestA);
});

it("keeps tenant, actor, and selected-client intents isolated", () => {
  const storage = memoryStorage();
  const otherScopes: FirstChatScope[] = [
    { ...scope, tenantId: "tenant-b" },
    { ...scope, actorId: "actor-b" },
    { ...scope, clientId: "22222222-2222-4222-8222-222222222222" },
  ];
  reserveFirstChatIntent(scope, storage, () => requestA);

  for (const other of otherScopes) {
    expect(readFirstChatIntent(other, storage)).toBeNull();
    expect(
      reserveFirstChatIntent(other, storage, () => requestB),
    ).toMatchObject({
      requestId: requestB,
      scope: other,
    });
  }
  expect(readFirstChatIntent(scope, storage)?.requestId).toBe(requestA);
  expect(storage.entries.size).toBe(4);
});

it("rejects corrupt or scope-changed stored identity without overwriting it", () => {
  const storage = memoryStorage();
  reserveFirstChatIntent(scope, storage, () => requestA);
  const entry = [...storage.entries][0];
  if (!entry) throw new Error("Expected one stored intent");
  const [key, original] = entry;
  storage.entries.set(
    key,
    JSON.stringify({
      ...JSON.parse(original),
      scope: {
        ...scope,
        actorId: "actor-b",
      },
    }),
  );
  const corrupt = storage.entries.get(key);

  expect(() => reserveFirstChatIntent(scope, storage, () => requestB)).toThrow(
    FirstChatIntentStorageError,
  );
  expect(storage.entries.get(key)).toBe(corrupt);
});

it("holds when storage cannot persist and read back the same request", () => {
  const storage = {
    getItem: () => null,
    setItem: () => undefined,
  };

  expect(() => reserveFirstChatIntent(scope, storage, () => requestA)).toThrow(
    FirstChatIntentStorageError,
  );
  expect(() =>
    reserveFirstChatIntent(
      scope,
      {
        getItem: () => {
          throw new Error("storage denied");
        },
        setItem: () => undefined,
      },
      () => requestA,
    ),
  ).toThrow(FirstChatIntentStorageError);
});

it("does not confirm a mismatched request or replace a confirmed conversation", () => {
  const storage = memoryStorage();
  reserveFirstChatIntent(scope, storage, () => requestA);

  expect(() =>
    confirmFirstChatIntent(scope, requestB, conversationA, storage),
  ).toThrow(FirstChatIntentStorageError);
  expect(readFirstChatIntent(scope, storage)?.state).toBe("pending");

  confirmFirstChatIntent(scope, requestA, conversationA, storage);
  expect(() =>
    confirmFirstChatIntent(
      scope,
      requestA,
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      storage,
    ),
  ).toThrow(FirstChatIntentStorageError);
  expect(readFirstChatIntent(scope, storage)).toMatchObject({
    state: "confirmed",
    conversationId: conversationA,
  });
});
