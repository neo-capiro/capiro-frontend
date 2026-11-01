import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  conversationIntentJournal,
  conversationSelectionOwner,
} from "../src/shared/meri-conversations/query-journal";
import { conversationTurnJournal } from "../src/shared/meri-conversations/turn-journal";
import { clearMeriConversationRecovery } from "../src/shared/meri-conversations/conversation-recovery";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";

const context = {
  tenantId: "tenant",
  actorId: "native-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
};
const scope = { ...context, clientId: context.selectedClientId };
const request = {
  requestId: "60000000-0000-4000-8000-000000000001",
  prompt: "Private retained input",
  state: "unknown" as const,
};
function memoryStorage(): TabStorage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    key: (index) => [...values.keys()][index] ?? null,
  };
}
function owners(
  cache: QueryClient,
  target: typeof context,
  storage?: TabStorage,
) {
  const intent = conversationIntentJournal(cache, target, storage);
  const turn = conversationTurnJournal(
    cache,
    target,
    target.selectedClientId,
    target.conversationId,
    storage,
  );
  const selection = conversationSelectionOwner(
    cache,
    target,
    target.selectedClientId,
    target.conversationId,
    storage,
  );
  const remembered = conversationSelectionOwner(
    cache,
    target,
    target.selectedClientId,
    undefined,
    storage,
  );
  return { intent, turn, selection, remembered };
}
function seed(
  cache: QueryClient,
  target: typeof context,
  storage?: TabStorage,
) {
  const value = owners(cache, target, storage);
  value.intent.write({ submit: request });
  value.turn.start(
    {
      ...target,
      attemptId: "40000000-0000-4000-8000-000000000001",
      workerId: "50000000-0000-4000-8000-000000000001",
      writerFence: 1,
    },
    request.prompt,
    request.requestId,
  );
  value.selection.record(target);
  value.remembered.record(target);
  return value;
}

it.each([false, true])(
  "revoked recovery cannot reappear in fresh owners sharing the same cache (persistent=%s)",
  (persistent) => {
    const cache = new QueryClient();
    const storage = persistent ? memoryStorage() : undefined;
    if (storage) syncMeriTabIdentity("synthetic-session", storage);
    const neighbors = [
      { ...context, tenantId: "other-tenant" },
      { ...context, actorId: "other-actor" },
      { ...context, selectedClientId: "10000000-0000-4000-8000-000000000002" },
      { ...context, conversationId: "20000000-0000-4000-8000-000000000002" },
    ];
    neighbors.forEach((target) => seed(cache, target, storage));
    // Seed the revoked pointer last: it shares the unqualified route slot with the neighboring conversation.
    const old = seed(cache, context, storage);
    const otherRun = conversationIntentJournal(
      cache,
      { ...context, runId: "30000000-0000-4000-8000-000000000002" },
      storage,
    );
    otherRun.write({ submit: request });
    cache.setQueryData(
      [
        "unrelated",
        context.tenantId,
        context.actorId,
        scope.clientId,
        scope.conversationId,
      ],
      "keep",
    );
    clearMeriConversationRecovery(cache, scope, storage);
    const fresh = owners(cache, context, storage);
    expect(fresh.intent.read()).toEqual({});
    expect(fresh.intent.recoveryBlocked).toBe(persistent);
    expect(fresh.intent.current()).toBe(!persistent);
    expect(fresh.turn.read()).toBeUndefined();
    expect(fresh.selection.hints).toEqual({
      clientId: scope.clientId,
      conversationId: scope.conversationId,
    });
    expect(fresh.remembered.hints).toEqual({ clientId: scope.clientId });
    expect(old.intent.current()).toBe(false);
    expect(old.turn.current()).toBe(false);
    expect(otherRun.current()).toBe(false);
    if (persistent)
      expect(() => old.intent.write({ submit: request })).toThrow();
    else expect(old.intent.write({ submit: request })).toBe(false);
    old.turn.write({ source: context, ...request, state: "unknown" });
    old.selection.record(context);
    old.remembered.record(context);
    expect(owners(cache, context, storage).intent.read()).toEqual({});
    expect(owners(cache, context, storage).turn.read()).toBeUndefined();
    expect(owners(cache, context, storage).remembered.hints).toEqual({
      clientId: scope.clientId,
    });
    for (const target of neighbors) {
      const retained = owners(cache, target, storage);
      expect(retained.intent.read().submit).toEqual(request);
      expect(retained.turn.read()?.prompt).toBe(request.prompt);
      expect(retained.selection.hints.runId).toBe(target.runId);
    }
    expect(
      cache.getQueryData([
        "unrelated",
        context.tenantId,
        context.actorId,
        scope.clientId,
        scope.conversationId,
      ]),
    ).toBe("keep");
    fresh.remembered.record(neighbors[3]!);
    clearMeriConversationRecovery(cache, scope, storage);
    expect(
      owners(cache, neighbors[3]!, storage).remembered.hints.conversationId,
    ).toBe(neighbors[3]!.conversationId);
  },
);

it.each([false, true])(
  "scope retirement erases private request bytes but keeps same-identity recovery blocked across reload (corrupt=%s)",
  (corrupt) => {
    const storage = memoryStorage();
    syncMeriTabIdentity("synthetic-session", storage);
    const cache = new QueryClient();
    const old = conversationIntentJournal(cache, context, storage);
    old.write({ submit: request });
    const key = Array.from({ length: storage.length }, (_, i) =>
      storage.key(i),
    ).find((value) => value?.includes('"request"'))!;
    expect(storage.getItem(key)).toContain(request.prompt);
    if (corrupt) storage.setItem(key, "{invalid-json");
    clearMeriConversationRecovery(cache, scope, storage);
    expect(old.current()).toBe(false);
    expect(() => old.write({ submit: request })).toThrow();
    const retired = storage.getItem(key);
    if (corrupt) expect(retired).toBe("null");
    else {
      expect(JSON.parse(retired!)).toMatchObject({ retired: true, key });
      expect(retired).not.toContain(request.prompt);
    }
    for (let n = 0; n < 2; n++) {
      syncMeriTabIdentity("synthetic-session", storage);
      const fresh = conversationIntentJournal(
        new QueryClient(),
        context,
        storage,
      );
      expect(fresh.recoveryBlocked).toBe(true);
      expect(fresh.current()).toBe(false);
      expect(fresh.read()).toEqual({});
      expect(fresh.read()).toEqual({});
      expect(() => fresh.write({ submit: request })).toThrow();
      expect(storage.getItem(key)).toBe(retired);
      clearMeriConversationRecovery(cache, scope, storage);
    }
    const nextRun = conversationIntentJournal(
      new QueryClient(),
      { ...context, runId: "30000000-0000-4000-8000-000000000003" },
      storage,
    );
    expect(nextRun.recoveryBlocked).toBe(false);
    expect(nextRun.current()).toBe(true);
    expect(nextRun.read()).toEqual({});
    expect(nextRun.write({ submit: request })).toBe(true);
    expect(storage.getItem(key)).toBe(retired);
    syncMeriTabIdentity("synthetic-other-session", storage);
    expect(storage.getItem(key)).toBeNull();
    const replacement = conversationIntentJournal(
      new QueryClient(),
      context,
      storage,
    );
    expect(replacement.recoveryBlocked).toBe(false);
    expect(replacement.current()).toBe(true);
    expect(replacement.read()).toEqual({});
  },
);
