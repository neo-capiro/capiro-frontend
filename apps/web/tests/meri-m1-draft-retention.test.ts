import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConversationView } from "../src/features/meri/conversation/ConversationView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationTurn } from "../src/features/meri/conversation/useConversationTurn";
import * as historyClient from "../src/shared/meri-conversations/history-client";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import { conversationSelectionOwner } from "../src/shared/meri-conversations/query-journal";
import { renewConversationSelection } from "../src/features/meri/conversation/conversation-selection";
import {
  conversationTurnJournal,
  recoverConversationTurn,
} from "../src/shared/meri-conversations/turn-journal";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import {
  syncMeriTabIdentity,
  TabJournalUnavailable,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { sendRequest } from "../src/features/meri/conversation/run-commands";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const scope = {
  tenantId: "synthetic",
  actorId: "native-actor",
  clientId: id(1),
  conversationId: id(2),
};
const context = { ...scope, selectedClientId: scope.clientId, runId: id(3) };
const request = { requestId: id(4), prompt: "Keep my draft" };
const observed = { ...request, state: "observed" as const };
const source = {
  tenantId: scope.tenantId,
  actorId: scope.actorId,
  conversationId: scope.conversationId,
  runId: context.runId,
  attemptId: id(5),
  workerId: id(6),
  writerFence: 1,
};
function memory() {
  const values = new Map<string, string>();
  let full = false;
  let turnFull = false;
  const storage = {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (full || (turnFull && key.includes('"turn"')))
        throw new Error("quota");
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  } satisfies TabStorage;
  syncMeriTabIdentity("native-session", storage);
  return {
    storage,
    values,
    fill: () => {
      full = true;
    },
    failTurns: () => {
      turnFull = true;
    },
    release: () => {
      full = false;
      turnFull = false;
    },
  };
}
it("restores raw unsent text only in the exact tenant native actor client and conversation", () => {
  const { storage, values } = memory();
  createInitialDraftOwner(scope, storage).edit("  Unsent question\n");
  const restored = createInitialDraftOwner(scope, storage);
  expect(restored.draft()).toBe("  Unsent question\n");
  expect(restored.hasPending(context)).toBe(false);
  for (const key of Object.keys(scope) as (keyof typeof scope)[])
    expect(
      createInitialDraftOwner({ ...scope, [key]: "foreign" }, storage).draft(),
    ).toBe("");
  expect([...values.values()].join()).not.toMatch(
    /credential|action_session_|Bearer/,
  );
});

it("does not consume a newer reserved draft when a failed turn write reloads the previous accepted request", async () => {
  const data = memory(),
    owner = createInitialDraftOwner(scope, data.storage);
  const openTurn = () =>
    conversationTurnJournal(
      new QueryClient(),
      scope,
      scope.clientId,
      scope.conversationId,
      data.storage,
    );
  const turn = openTurn(),
    targetBinding = { ...source, runId: id(20) };
  const receipt = {
    schema: "meri.conversation-turn/1" as const,
    sourceBinding: source,
    targetBinding,
    state: "RESERVED" as const,
    replayed: true,
  };
  owner.edit(request.prompt);
  owner.reserve(owner.draft(), request);
  turn.start(source, request.prompt, request.requestId);
  await recoverConversationTurn(turn, async () => receipt);
  const target = { ...context, runId: targetBinding.runId };
  owner.bindNext(target, request);
  expect(owner.acknowledge(target, observed, owner.draft())).toBe(true);
  const newer = { requestId: id(21), prompt: "NEW question" };
  owner.edit(newer.prompt);
  owner.reserve(owner.draft(), newer);
  data.failTurns();
  expect(() =>
    turn.start(targetBinding, newer.prompt, newer.requestId),
  ).toThrow(TabJournalUnavailable);
  data.release();
  const restored = createInitialDraftOwner(scope, data.storage),
    recovered = openTurn();
  expect(recovered.read()?.requestId).toBe(request.requestId);
  await recoverConversationTurn(recovered, async () => receipt);
  restored.bindNext(target, request);
  expect(restored.acknowledge(target, observed, restored.draft())).toBe(false);
  expect(createInitialDraftOwner(scope, data.storage).draft()).toBe(
    newer.prompt,
  );
  const nextTarget = { ...target, runId: id(22) };
  restored.bindNext(nextTarget, newer);
  expect(
    restored.acknowledge(
      nextTarget,
      { ...newer, state: "observed" },
      restored.draft(),
    ),
  ).toBe(true);
});

it("captures one immutable next-turn identity inside the command gate before dispatch and rejects a duplicate click", async () => {
  const { storage } = memory(),
    cache = new QueryClient(),
    owner = createInitialDraftOwner(scope, storage);
  vi.stubGlobal("window", { sessionStorage: storage });
  let release!: (
    receipt: Awaited<ReturnType<typeof historyClient.reserveConversationTurn>>,
  ) => void;
  const reserve = vi
    .spyOn(historyClient, "reserveConversationTurn")
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
  let continuation!: ReturnType<typeof useConversationTurn>;
  const open = vi.fn();
  function Probe() {
    continuation = useConversationTurn(
      scope,
      scope.clientId,
      scope.conversationId,
      open,
    );
    return null;
  }
  try {
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(Probe),
      ),
    );
    owner.edit(request.prompt);
    const capture = vi.fn((input: typeof request) => {
      expect(reserve).not.toHaveBeenCalled();
      owner.reserve(owner.draft(), input);
    });
    const first = continuation.start(source, request.prompt, capture);
    expect(capture).toHaveBeenCalledOnce();
    const captured = capture.mock.calls[0]![0];
    expect(
      conversationTurnJournal(
        new QueryClient(),
        scope,
        scope.clientId,
        scope.conversationId,
        storage,
      ).read(),
    ).toMatchObject(captured);
    owner.edit("Newer typed input");
    const duplicateCapture = vi.fn();
    const duplicate = continuation.start(
      source,
      "Newer typed input",
      duplicateCapture,
    );
    expect(duplicateCapture).not.toHaveBeenCalled();
    expect(await duplicate).toBe(false);
    expect(reserve).toHaveBeenCalledOnce();
    const targetBinding = { ...source, runId: id(30) };
    release({
      schema: "meri.conversation-turn/1",
      sourceBinding: source,
      targetBinding,
      state: "RESERVED",
      replayed: false,
    });
    expect(await first).toBe(true);
    expect(open).toHaveBeenCalledExactlyOnceWith({
      conversationId: scope.conversationId,
      runId: targetBinding.runId,
      pending: captured.prompt,
      requestId: captured.requestId,
    });
    const restored = createInitialDraftOwner(scope, storage),
      target = { ...context, runId: targetBinding.runId };
    restored.bindNext(target, captured);
    expect(
      restored.acknowledge(
        target,
        { ...captured, state: "observed" },
        restored.draft(),
      ),
    ).toBe(false);
    expect(restored.draft()).toBe("Newer typed input");
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
it("retains immutable delivery identity on reload and preserves edited ABA text after the exact ACK", async () => {
  const { storage } = memory(),
    owner = createInitialDraftOwner(scope, storage);
  owner.edit(request.prompt);
  const journal = conversationIntentJournal(
    new QueryClient(),
    context,
    storage,
  );
  const submitInitial = vi.fn(async (input: typeof request) => {
    expect(createInitialDraftOwner(scope, storage).hasPending(context)).toBe(
      true,
    );
    expect(
      conversationIntentJournal(new QueryClient(), context, storage).read()
        .submit?.requestId,
    ).toBe(input.requestId);
    throw new Error("lost ACK");
  });
  await expect(
    sendRequest(
      { submitInitial } as unknown as MeriConversationPort,
      journal,
      request.prompt,
      false,
      true,
      (input) => owner.begin(context, input, owner.draft()),
    ),
  ).rejects.toThrow("lost ACK");
  owner.edit("A newer question");
  owner.edit(request.prompt);
  const restored = createInitialDraftOwner(scope, storage),
    recovery = conversationIntentJournal(new QueryClient(), context, storage);
  expect(recovery.read().submit?.state).toBe("unknown");
  expect(submitInitial).toHaveBeenCalledOnce();
  const replay = vi.fn(async () => {});
  await sendRequest(
    {
      submitInitial: replay,
      getSnapshot: () => ({ submit: "idle" }),
    } as unknown as MeriConversationPort,
    recovery,
    "ignored changed input",
    true,
  );
  expect(replay).toHaveBeenCalledExactlyOnceWith(
    submitInitial.mock.calls[0]![0],
  );
  expect(
    restored.acknowledge(context, recovery.read().submit, restored.draft()),
  ).toBe(false);
  expect(createInitialDraftOwner(scope, storage).draft()).toBe(request.prompt);
});
it("retains next-turn draft capture through conflict and reload until explicit same-source recovery", async () => {
  const { storage } = memory(),
    owner = createInitialDraftOwner(scope, storage);
  owner.edit(" Keep my draft ");
  owner.reserve(owner.draft(), request);
  const openTurn = () =>
    conversationTurnJournal(
      new QueryClient(),
      scope,
      scope.clientId,
      scope.conversationId,
      storage,
    );
  const turn = openTurn();
  turn.start(source, request.prompt, request.requestId);
  await expect(
    recoverConversationTurn(turn, async () => {
      throw new ConversationHistoryUnavailable(
        409,
        "CONVERSATION_TURN_CONFLICT",
        "NOT_DISPATCHED",
      );
    }),
  ).rejects.toThrow();
  const restored = createInitialDraftOwner(scope, storage),
    recoveredTurn = openTurn();
  expect(restored.draft()).toBe(" Keep my draft ");
  expect(recoveredTurn.read()).toMatchObject({
    requestId: request.requestId,
    prompt: request.prompt,
    state: "unknown",
  });
  const reserve = vi.fn(async () => ({
    schema: "meri.conversation-turn/1" as const,
    sourceBinding: source,
    targetBinding: { ...source, runId: id(7) },
    state: "RESERVED" as const,
    replayed: true,
  }));
  expect(reserve).not.toHaveBeenCalled();
  const retained = await recoverConversationTurn(recoveredTurn, reserve);
  expect(reserve).toHaveBeenCalledExactlyOnceWith({
    conversationId: scope.conversationId,
    sourceRunId: source.runId,
  });
  const target = { ...context, runId: retained.receipt!.targetBinding.runId };
  restored.bindNext(target, request);
  const reopened = createInitialDraftOwner(scope, storage);
  // A crash before target-session selection is recorded reopens the still-selected source.
  reopened.select(context);
  expect(reopened.hasPending(target)).toBe(true);
  reopened.bindNext(target, request);
  expect(reopened.acknowledge(target, observed, reopened.draft())).toBe(true);
  expect(createInitialDraftOwner(scope, storage).draft()).toBe("");
});
it("keeps typed text on quota failure and blocks dispatch when draft capture cannot be saved", async () => {
  const data = memory(),
    owner = createInitialDraftOwner(scope, data.storage);
  owner.edit("Older draft");
  data.fill();
  expect(() => owner.edit("New unsaved text")).toThrow(TabJournalUnavailable);
  expect(owner.draft()).toBe("New unsaved text");
  data.release();
  const submitInitial = vi.fn(),
    journal = conversationIntentJournal(
      new QueryClient(),
      context,
      data.storage,
    );
  await expect(
    sendRequest(
      { submitInitial } as unknown as MeriConversationPort,
      journal,
      owner.draft(),
      false,
      true,
      (input) => owner.begin(context, input, owner.draft()),
    ),
  ).rejects.toThrow(TabJournalUnavailable);
  expect(submitInitial).not.toHaveBeenCalled();
  expect(owner.error()).toContain("Keep this page open");
  const draftKey = [...data.values.keys()].find((key) =>
    key.includes('"draft"'),
  )!;
  data.storage.setItem(draftKey, "corrupt");
  expect(createInitialDraftOwner(scope, data.storage).error()).toContain(
    "safely save or recover",
  );
});
it("persists ACK consumption atomically and retains the capture when its write fails", () => {
  const data = memory(),
    owner = createInitialDraftOwner(scope, data.storage);
  owner.edit(request.prompt);
  owner.begin(context, request, owner.draft());
  data.fill();
  expect(() => owner.acknowledge(context, observed, owner.draft())).toThrow(
    TabJournalUnavailable,
  );
  expect(owner.draft()).toBe(request.prompt);
  expect(owner.hasPending(context)).toBe(true);
  data.release();
  const restored = createInitialDraftOwner(scope, data.storage);
  expect(restored.acknowledge(context, observed, restored.draft())).toBe(true);
  const afterAck = createInitialDraftOwner(scope, data.storage);
  expect(afterAck.draft()).toBe("");
  expect(afterAck.hasPending(context)).toBe(false);
  expect(afterAck.acknowledge(context, observed, request.prompt)).toBe(false);
});

it("reauthorization creates a fresh exact selection writer without resurrecting revoked cached text", () => {
  const { storage } = memory(),
    cache = new QueryClient();
  const oldSelection = conversationSelectionOwner(
    cache,
    scope,
    scope.clientId,
    undefined,
    storage,
  );
  oldSelection.record(context);
  const oldRequest = conversationIntentJournal(cache, context, storage);
  oldRequest.write({ submit: { ...request, state: "pending" } });
  const renewed = renewConversationSelection(cache, scope, undefined, storage);
  expect(renewed.hints).toEqual({ clientId: scope.clientId });
  expect(conversationIntentJournal(cache, context, storage).read()).toEqual({});
  const target = { ...context, runId: id(10) };
  renewed.record(target);
  oldSelection.record(context);
  expect(() => oldRequest.write({ submit: observed })).toThrow(
    TabJournalUnavailable,
  );
  expect(
    conversationSelectionOwner(
      new QueryClient(),
      scope,
      scope.clientId,
      undefined,
      storage,
    ).hints,
  ).toEqual({
    clientId: scope.clientId,
    conversationId: scope.conversationId,
    runId: target.runId,
  });
});

it("holds draft entry until exact conversation selection while storage failure keeps known-scope text editable", () => {
  const session = {
    connection: { state: { status: "connecting" } },
    earlier: [],
    accessLost: false,
    draft: "Unsent draft",
    setDraft: vi.fn(),
    textarea: { current: null },
    history: { query: { isPending: true }, tail: {}, selected: false },
    continuation: { busy: false, failed: false },
  } as unknown as Parameters<typeof ConversationView>[0]["session"];
  const render = (patch: Partial<typeof session>) =>
    renderToStaticMarkup(
      createElement(ConversationView, {
        session: { ...session, ...patch },
        scope: "Synthetic client",
      }),
    );
  const unbound = render({});
  expect(unbound.match(/<textarea[^>]*>/i)?.[0]).toMatch(/readonly/i);
  expect(unbound).toContain(
    "Confirming this conversation before saving a draft.",
  );
  const known = render({
    selectedId: scope.conversationId,
    storageError: new TabJournalUnavailable().message,
  });
  expect(known.match(/<textarea[^>]*>/i)?.[0]).not.toMatch(/readonly/i);
  expect(known).toContain("Unsent draft");
  expect(known).toContain("Keep this page open");
  expect(
    known.match(/<button[^>]*aria-label="Send message"[^>]*>/i)?.[0],
  ).toMatch(/disabled/i);
});
