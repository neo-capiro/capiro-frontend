import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useConversationTurn } from "../src/features/meri/conversation/useConversationTurn";
import * as historyClient from "../src/shared/meri-conversations/history-client";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import {
  conversationIntentJournal,
  storedSubmission,
  type ConversationDraftRequest,
} from "../src/shared/meri-conversations/query-journal";
import {
  conversationTurnJournal,
  recoverConversationTurn,
} from "../src/shared/meri-conversations/turn-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import {
  matchesStoredRequest,
  recoverRequest,
  sendRequest,
} from "../src/features/meri/conversation/run-commands";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";

// Synthetic choices exercise identity only; they do not qualify any provider/model.
const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const scope = {
  tenantId: "synthetic",
  actorId: "actor",
  clientId: null,
  conversationId: id(1),
};
const context = { ...scope, selectedClientId: null, runId: id(2) };
const source = {
  ...context,
  attemptId: id(3),
  workerId: id(4),
  writerFence: 1,
};
const selection = {
  provider: "bedrock" as const,
  modelId: "synthetic",
  effort: "high" as const,
};
const input = {
  requestId: id(5),
  prompt: "Synthetic question",
  modelSelection: selection,
};
const saved = { ...input, window: null, windowRequest: null, skill: null };
function memory() {
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
  syncMeriTabIdentity("synthetic-session", storage);
  return storage;
}

it("explicit selection is frozen before initial capture and reused after a lost ACK despite later choices", async () => {
  const cache = new QueryClient(),
    journal = conversationIntentJournal(cache, context);
  const choice = { ...selection };
  const captured: ConversationSubmitRequest[] = [];
  const submitInitial = vi.fn(async (request: ConversationSubmitRequest) => {
    expect(journal.read().submit!.modelSelection).toEqual(selection);
    captured.push(structuredClone(request));
    if (captured.length === 1) throw Error("lost ACK");
  });
  const port = {
    submitInitial,
    getSnapshot: () => ({ submit: "idle" }),
  } as unknown as MeriConversationPort;
  const capture = vi.fn((request: ConversationSubmitRequest) =>
    expect(request.modelSelection).toEqual(selection),
  );
  try {
    await expect(
      sendRequest(port, journal, input.prompt, false, true, capture, choice),
    ).rejects.toThrow("lost ACK");
    choice.modelId = "later-choice";
    expect(Object.isFrozen(journal.read().submit!.modelSelection)).toBe(true);
    await sendRequest(
      port,
      journal,
      "different draft",
      true,
      true,
      capture,
      choice,
    );
    expect(captured[1]).toEqual(captured[0]);
    expect(capture).toHaveBeenCalledOnce();
  } finally {
    cache.clear();
  }
});

it("next-turn reservation reload retains choice and initial-draft identity without issuing a request", async () => {
  const storage = memory(),
    cache = new QueryClient();
  const journal = conversationTurnJournal(
    cache,
    scope,
    null,
    scope.conversationId,
    storage,
  );
  const draft = createInitialDraftOwner(scope, storage);
  draft.edit(input.prompt);
  draft.reserve(input.prompt, input);
  journal.start(source, input.prompt, input.requestId, selection);
  await expect(
    recoverConversationTurn(journal, async () => {
      throw Error("lost reservation ACK");
    }),
  ).rejects.toThrow();
  cache.clear();
  const reloadCache = new QueryClient();
  try {
    const restored = conversationTurnJournal(
      reloadCache,
      scope,
      null,
      scope.conversationId,
      storage,
    );
    expect(restored.read()).toMatchObject({ ...input, state: "unknown" });
    expect(
      restored.write({
        ...restored.read()!,
        modelSelection: { ...selection, effort: "low" },
      }),
    ).toBe(false);
    const target = { ...source, runId: id(7) };
    await recoverConversationTurn(restored, async () => ({
      schema: "meri.conversation-turn/1",
      sourceBinding: source,
      targetBinding: target,
      state: "RESERVED",
      replayed: true,
    }));
    const owner = createInitialDraftOwner(scope, storage);
    owner.bindNext({ ...context, runId: target.runId }, input);
    expect(owner.hasPending({ ...context, runId: target.runId })).toBe(true);
    expect(restored.read()!.modelSelection).toEqual(selection);
    expect(
      conversationTurnJournal(
        reloadCache,
        { ...scope, actorId: "other" },
        null,
        scope.conversationId,
        storage,
      ).read(),
    ).toBeUndefined();
  } finally {
    reloadCache.clear();
  }
});

it("command reload keeps the explicit choice and retires it with tab identity", () => {
  const storage = memory(),
    cache = new QueryClient();
  conversationIntentJournal(cache, context, storage).write({
    submit: { ...input, state: "unknown" },
  });
  cache.clear();
  const next = new QueryClient();
  try {
    const restored = conversationIntentJournal(next, context, storage);
    expect(restored.read().submit).toMatchObject(input);
    syncMeriTabIdentity("replacement-session", storage);
    expect(restored.current()).toBe(false);
  } finally {
    next.clear();
  }
});

it("the live next-turn hook seeds the exact target command before opening its session", async () => {
  const storage = memory(),
    cache = new QueryClient();
  vi.stubGlobal("window", { sessionStorage: storage });
  const targetBinding = { ...source, runId: id(20) };
  const reserve = vi
    .spyOn(historyClient, "reserveConversationTurn")
    .mockResolvedValue({
      schema: "meri.conversation-turn/1",
      sourceBinding: source,
      targetBinding,
      state: "RESERVED",
      replayed: false,
    });
  let hook!: ReturnType<typeof useConversationTurn>;
  const open = vi.fn(
    (target: {
      modelSelection?: ConversationSubmitRequest["modelSelection"];
    }) => {
      expect(target.modelSelection).toEqual(selection);
      const commands = conversationIntentJournal(
        cache,
        { ...context, runId: targetBinding.runId },
        storage,
      );
      expect(commands.read().submit!.modelSelection).toEqual(selection);
    },
  );
  function Probe() {
    hook = useConversationTurn(scope, null, scope.conversationId, open);
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
    const capture = vi.fn((request: ConversationDraftRequest) =>
      expect(request.modelSelection).toEqual(selection),
    );
    expect(await hook.start(source, input.prompt, capture, selection)).toBe(
      true,
    );
    expect(capture).toHaveBeenCalledOnce();
    expect(reserve).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledOnce();
  } finally {
    cache.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

it("resolved default history matches an omitted original choice but rejects an explicit mismatch", () => {
  const omitted = {
    requestId: input.requestId,
    prompt: input.prompt,
    state: "unknown" as const,
  };
  expect(matchesStoredRequest(omitted, saved)).toBe(true);
  expect(
    matchesStoredRequest({ ...omitted, modelSelection: selection }, saved),
  ).toBe(true);
  expect(
    matchesStoredRequest(
      { ...omitted, modelSelection: { ...selection, effort: "low" } },
      saved,
    ),
  ).toBe(false);
  const historical = {
    requestId: saved.requestId,
    prompt: saved.prompt,
    window: null,
    windowRequest: null,
    skill: null,
  };
  expect(matchesStoredRequest(omitted, historical)).toBe(true);
  expect(
    matchesStoredRequest({ ...omitted, modelSelection: selection }, historical),
  ).toBe(false);
  expect(storedSubmission(saved).modelSelection).toEqual(selection);
  expect(storedSubmission(historical)).not.toHaveProperty("modelSelection");
});

it("positive recovery preserves original omission, while history-only recovery pins the admitted choice", async () => {
  for (const retained of [false, true]) {
    const cache = new QueryClient(),
      journal = conversationIntentJournal(cache, context);
    if (retained)
      journal.write({
        submit: {
          requestId: input.requestId,
          prompt: input.prompt,
          state: "unknown",
          workflow: "initial",
        },
      });
    const submit = vi.fn(async (request: ConversationSubmitRequest) => {
      expect(request.modelSelection).toEqual(retained ? undefined : selection);
      expect(request).not.toHaveProperty("workflow");
    });
    try {
      await recoverRequest(
        {
          submit,
          getSnapshot: () => ({ submit: "idle" }),
        } as unknown as MeriConversationPort,
        journal,
        saved,
      );
      expect(submit).toHaveBeenCalledOnce();
    } finally {
      cache.clear();
    }
  }
});
