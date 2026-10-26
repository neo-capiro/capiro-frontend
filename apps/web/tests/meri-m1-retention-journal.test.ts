import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  conversationIntentJournal,
  conversationSelectionOwner,
} from "../src/shared/meri-conversations/query-journal";
import {
  conversationTurnJournal,
  recoverConversationTurn,
} from "../src/shared/meri-conversations/turn-journal";
import {
  tabRecord,
  syncMeriTabIdentity,
  clearMeriConversationScope,
  TabJournalUnavailable,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import {
  sendRequest,
  requestStop,
} from "../src/features/meri/conversation/run-commands";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";

function memoryStorage() {
  const data = new Map<string, string>();
  let rejectWrites = false;
  const storage = {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (rejectWrites) throw new Error("quota");
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    rejectWrites: () => {
      rejectWrites = true;
    },
  } satisfies TabStorage & { rejectWrites(): void };
  syncMeriTabIdentity("retention-fixture-session", storage);
  return storage;
}
function recordKey(storage: TabStorage) {
  return Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).find((key) => key?.startsWith("capiro-meri-chat-v1:"))!;
}
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
const source = {
  ...account,
  conversationId: context.conversationId,
  runId: context.runId,
  attemptId: "40000000-0000-4000-8000-000000000001",
  workerId: "50000000-0000-4000-8000-000000000001",
  writerFence: 1,
};
const request = {
  requestId: "60000000-0000-4000-8000-000000000001",
  prompt: "Synthetic retained message",
};
const cache = () => new QueryClient();
const receiveText = (value: unknown) =>
  z.strictObject({ text: z.string() }).parse(value);
afterEach(() => vi.unstubAllGlobals());

it("opt-in submit recovery preserves canonical bytes as unknown in only its exact scope", () => {
  const storage = memoryStorage();
  const input = {
    ...request,
    skill: {
      skillId: "quick_skill.research_company" as const,
      skillVersion: "1.0.0",
    },
    windowRequest: {
      basis: "calendar-month" as const,
      offset: 0 as const,
      timezone: "UTC",
    },
  };
  const journal = conversationIntentJournal(cache(), context, storage);
  journal.write({
    submit: { ...input, state: "observed", workflow: "initial" },
    cancel: "pending",
  });
  const recovered = conversationIntentJournal(cache(), context, storage);
  expect(recovered.read()).toEqual({
    submit: { ...input, state: "unknown", workflow: "initial" },
    cancel: "unknown",
  });
  for (const name of [
    "tenantId",
    "actorId",
    "selectedClientId",
    "conversationId",
    "runId",
  ] as const) {
    const other = {
      ...context,
      [name]:
        name.endsWith("Id") && name !== "tenantId" && name !== "actorId"
          ? "70000000-0000-4000-8000-000000000001"
          : "other",
    };
    expect(conversationIntentJournal(cache(), other, storage).read()).toEqual(
      {},
    );
  }
  vi.stubGlobal("window", { sessionStorage: storage });
  expect(conversationIntentJournal(cache(), context).read()).toEqual({});
  expect(() =>
    journal.write({
      submit: { ...request, state: "pending", credential: "not-permitted" },
    } as never),
  ).toThrow(TabJournalUnavailable);
});

it("selection reload reopens the exact run and corrupt selection cannot silently broaden", () => {
  const storage = memoryStorage();
  const select = () =>
    conversationSelectionOwner(
      cache(),
      account,
      scope.clientId,
      context.conversationId,
      storage,
    );
  select().record(context);
  expect(select().hints).toEqual({
    clientId: scope.clientId,
    conversationId: context.conversationId,
    runId: context.runId,
  });
  expect(
    conversationSelectionOwner(
      cache(),
      { ...account, actorId: "other" },
      scope.clientId,
      context.conversationId,
      storage,
    ).hints,
  ).toEqual({
    clientId: scope.clientId,
    conversationId: context.conversationId,
  });
  expect(() => select().record({ ...context, actorId: "other" })).toThrow(
    TabJournalUnavailable,
  );
  storage.setItem(recordKey(storage), "corrupt");
  expect(select).toThrow(TabJournalUnavailable);
});

it("turn reload requires explicit same-source recovery with the original immutable input", async () => {
  const storage = memoryStorage();
  const open = () =>
    conversationTurnJournal(
      cache(),
      account,
      scope.clientId,
      context.conversationId,
      storage,
    );
  const journal = open();
  journal.start(source, request.prompt, request.requestId);
  const receipt = {
    schema: "meri.conversation-turn/1" as const,
    sourceBinding: source,
    targetBinding: { ...source, runId: "30000000-0000-4000-8000-000000000002" },
    state: "RESERVED" as const,
    replayed: true,
  };
  journal.write({ ...journal.read()!, receipt, state: "ready" });
  const restored = open();
  expect(restored.read()).toEqual({
    ...request,
    state: "unknown",
    source: {
      ...account,
      conversationId: context.conversationId,
      runId: context.runId,
    },
  });
  expect(storage.getItem(recordKey(storage))).not.toContain("targetBinding");
  const reserve = vi.fn(async () => receipt);
  expect(reserve).not.toHaveBeenCalled();
  const recovered = await recoverConversationTurn(restored, reserve);
  expect(reserve).toHaveBeenCalledExactlyOnceWith({
    conversationId: context.conversationId,
    sourceRunId: context.runId,
  });
  expect(recovered).toMatchObject({
    ...request,
    source,
    receipt,
    state: "ready",
  });
  expect(() =>
    restored.start(source, "Replacement", crypto.randomUUID()),
  ).toThrow("Recover the retained turn first");
});

it("storage refusal or corruption blocks send before dispatch and reservation before admission", async () => {
  const storage = memoryStorage();
  const journal = conversationIntentJournal(cache(), context, storage);
  const submit = vi.fn();
  const port = { submit } as unknown as MeriConversationPort;
  storage.rejectWrites();
  await expect(
    sendRequest(port, journal, request.prompt, false),
  ).rejects.toThrow(TabJournalUnavailable);
  expect(submit).not.toHaveBeenCalled();
  expect(journal.read()).toEqual({});
  const turn = conversationTurnJournal(
    cache(),
    account,
    scope.clientId,
    context.conversationId,
    storage,
  );
  expect(() => turn.start(source, request.prompt, request.requestId)).toThrow(
    TabJournalUnavailable,
  );
  expect(turn.read()).toBeUndefined();
  const corrupt = memoryStorage();
  conversationIntentJournal(cache(), context, corrupt).write({
    submit: { ...request, state: "pending" },
  });
  corrupt.setItem(recordKey(corrupt), "{}");
  const blocked = conversationIntentJournal(cache(), context, corrupt);
  expect(blocked.recoveryBlocked).toBe(true);
  await expect(
    sendRequest(port, blocked, "Replacement", false),
  ).rejects.toThrow(TabJournalUnavailable);
  expect(submit).not.toHaveBeenCalled();
});

it("tab envelopes reject copied scope or run, unknown fields, unsupported versions and oversized values", () => {
  const storage = memoryStorage();
  const original = tabRecord(scope, "request", receiveText, "run-a", storage);
  original.write({ text: "retained" });
  const originalKey = recordKey(storage);
  const raw = storage.getItem(originalKey)!;
  for (const [otherScope, run] of [
    [{ ...scope, actorId: "other" }, "run-a"],
    [scope, "run-b"],
  ] as const) {
    const other = tabRecord(otherScope, "request", receiveText, run, storage);
    other.write({ text: "separate" });
    const key = storage.key(storage.length - 1)!;
    storage.setItem(key, raw);
    expect(() => other.read()).toThrow(TabJournalUnavailable);
  }
  for (const change of [
    { version: 2 },
    { extra: true },
    { value: { text: "x".repeat(262_144) } },
  ]) {
    storage.setItem(
      originalKey,
      JSON.stringify({ ...JSON.parse(raw), ...change }),
    );
    expect(() => original.read()).toThrow(TabJournalUnavailable);
  }
  expect(() => original.write({ text: "x".repeat(262_144) })).toThrow(
    TabJournalUnavailable,
  );
  const many = memoryStorage();
  for (let index = 0; index < 128; index++)
    tabRecord(scope, "draft", receiveText, String(index), many).write({
      text: "a",
    });
  expect(() =>
    tabRecord(scope, "draft", receiveText, "overflow", many).write({
      text: "a",
    }),
  ).toThrow(TabJournalUnavailable);
  const large = memoryStorage();
  for (let index = 0; index < 8; index++)
    tabRecord(scope, "draft", receiveText, String(index), large).write({
      text: "x".repeat(250_000),
    });
  expect(() =>
    tabRecord(scope, "draft", receiveText, "overflow", large).write({
      text: "x".repeat(250_000),
    }),
  ).toThrow(TabJournalUnavailable);
});

it("signout and identity replacement purge Meri recovery and invalidate old writers without touching unrelated data", () => {
  const storage = memoryStorage();
  syncMeriTabIdentity("native-session-a", storage);
  const record = tabRecord(scope, "draft", receiveText, "", storage);
  record.write({ text: "Draft" });
  storage.setItem("unrelated", "keep");
  storage.setItem("capiro-meri-lifecycle-v1:test", "control");
  storage.setItem("capiro-meri-first-chat-intent-v1:test", "first");
  syncMeriTabIdentity("native-session-a", storage);
  expect(record.read()).toEqual({ text: "Draft" });
  syncMeriTabIdentity("native-session-b", storage);
  expect(storage.length).toBe(2);
  expect(storage.getItem("unrelated")).toBe("keep");
  expect(() => record.write({ text: "late" })).toThrow(TabJournalUnavailable);
  tabRecord(scope, "draft", receiveText, "", storage).write({
    text: "New draft",
  });
  syncMeriTabIdentity(null, storage);
  expect(storage.length).toBe(1);
  expect(storage.getItem("unrelated")).toBe("keep");
});

it("scope revocation fences old writers while another conversation remains writable", () => {
  const storage = memoryStorage();
  const revoked = tabRecord(scope, "request", receiveText, "run", storage);
  const otherScope = {
    ...scope,
    conversationId: "20000000-0000-4000-8000-000000000002",
  };
  const other = tabRecord(otherScope, "request", receiveText, "run", storage);
  revoked.write({ text: "Private retained prompt" });
  other.write({ text: "Other prompt" });
  clearMeriConversationScope(scope, storage);
  expect(() => revoked.write({ text: "Late private response" })).toThrow(
    TabJournalUnavailable,
  );
  expect(() => revoked.read()).toThrow(TabJournalUnavailable);
  expect(() =>
    tabRecord(scope, "request", receiveText, "run", storage).read(),
  ).toThrow(TabJournalUnavailable);
  other.write({ text: "Other response" });
  expect(other.read()).toEqual({ text: "Other response" });
});

it("revocation removes only the matching remembered conversation and fences its previous selection writer", () => {
  const storage = memoryStorage();
  const select = (who = account, clientId = scope.clientId) =>
    conversationSelectionOwner(cache(), who, clientId, undefined, storage);
  const revoked = select();
  revoked.record(context);
  const otherAccount = { ...account, actorId: "other-actor" };
  const otherClient = "10000000-0000-4000-8000-000000000002";
  const accountPointer = select(otherAccount);
  accountPointer.record({ ...context, ...otherAccount });
  const clientPointer = select(account, otherClient);
  clientPointer.record({ ...context, selectedClientId: otherClient });
  clearMeriConversationScope(scope, storage);
  expect(select().hints).toEqual({ clientId: scope.clientId });
  revoked.record(context);
  expect(select().hints).toEqual({ clientId: scope.clientId });
  expect(select(otherAccount).hints.conversationId).toBe(
    context.conversationId,
  );
  expect(select(account, otherClient).hints.conversationId).toBe(
    context.conversationId,
  );
  const otherConversation = "20000000-0000-4000-8000-000000000002";
  const current = select();
  current.record({ ...context, conversationId: otherConversation });
  clearMeriConversationScope(scope, storage);
  current.record({ ...context, conversationId: otherConversation });
  expect(select().hints.conversationId).toBe(otherConversation);
});

it("revoked mounted journals refuse recovery before any reservation or submit request", async () => {
  const storage = memoryStorage();
  const queries = cache();
  const turn = conversationTurnJournal(
    queries,
    account,
    scope.clientId,
    context.conversationId,
    storage,
  );
  const submitJournal = conversationIntentJournal(queries, context, storage);
  turn.start(source, request.prompt, request.requestId);
  submitJournal.write({ submit: { ...request, state: "pending" } });
  clearMeriConversationScope(scope, storage);
  const reserve = vi.fn(async () => {
    throw new Error("Unexpected reservation");
  });
  await expect(recoverConversationTurn(turn, reserve)).rejects.toThrow();
  expect(reserve).not.toHaveBeenCalled();
  expect(turn.current()).toBe(false);
  expect(turn.read()).toBeUndefined();
  const submit = vi.fn();
  await expect(
    sendRequest(
      { submit } as unknown as MeriConversationPort,
      submitJournal,
      "Replacement",
      false,
    ),
  ).rejects.toThrow(TabJournalUnavailable);
  expect(submit).not.toHaveBeenCalled();
  const cancel = vi.fn();
  await expect(
    requestStop({ cancel } as unknown as MeriConversationPort, submitJournal),
  ).rejects.toThrow(TabJournalUnavailable);
  expect(cancel).not.toHaveBeenCalled();
  expect(submitJournal.current()).toBe(false);
  expect(submitJournal.read()).toEqual({});
});

it("a storage failure after submit keeps its identity and never claims the request was unsent", async () => {
  const storage = memoryStorage();
  const journal = conversationIntentJournal(cache(), context, storage);
  const submit = vi.fn(async (input: unknown) => {
    expect(input).toMatchObject({ prompt: request.prompt });
    storage.rejectWrites();
  });
  const result = sendRequest(
    { submit } as unknown as MeriConversationPort,
    journal,
    request.prompt,
    false,
  );
  await expect(result).rejects.toThrow(
    "recover its status before trying again",
  );
  await expect(result).rejects.not.toThrow("No new request was sent");
  expect(submit).toHaveBeenCalledTimes(1);
  expect(journal.read().submit).toMatchObject(
    submit.mock.calls[0]![0] as object,
  );
  expect(journal.read().submit?.state).toBe("unknown");
  expect(
    conversationIntentJournal(cache(), context, storage).read().submit,
  ).toEqual(journal.read().submit);
});
