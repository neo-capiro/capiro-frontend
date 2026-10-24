import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationTurn } from "../src/features/meri/conversation/useConversationTurn";
import { sessionHistoryState } from "../src/features/meri/conversation/saved-turns";
import {
  conversationTurnJournal,
  recoverConversationTurn,
} from "../src/shared/meri-conversations/turn-journal";
import {
  syncMeriTabIdentity,
  clearMeriConversationScope,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import * as transport from "../src/shared/meri-conversations/history-client";
import {
  binding,
  nextBinding,
  clientId,
  event,
  status,
} from "../test/browser/meri-conversation-fixtures";
import {
  conversation,
  turn,
  nextRequestId,
} from "../test/browser/meri-history-fixtures";

// Actual hook/journal/public receiver, with effect scheduling controlled as in the readmission suite.
// This is no browser or live service claim.
const effects = vi.hoisted(() => [] as Array<() => unknown>);
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => unknown) => {
    effects.push(effect);
  },
}));
const account = { tenantId: binding.tenantId, actorId: binding.actorId };
const scope = { ...account, clientId, conversationId: binding.conversationId };
const selection = {
  provider: "bedrock" as const,
  modelId: "synthetic-qualified",
  effort: "high" as const,
};
const prompt = "Synthetic completed next request";
function memory() {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
  };
  syncMeriTabIdentity("synthetic-signed-in", storage);
  vi.stubGlobal("window", { sessionStorage: storage });
  return storage;
}
async function completedPage() {
  const target = turn(nextBinding, nextRequestId, prompt, 2, 2);
  target.request.modelSelection = selection;
  const value = {
    schema: "meri.conversation-transcript/1",
    conversation,
    latestRun: target.run,
    latestSequenceBase: 2,
    turns: [target],
    events: [
      event(1, "Retained answer", nextBinding),
      status(2, "completed", nextBinding),
    ].map((event, index) => ({ sequence: index + 3, event })),
    nextSequence: 4,
    lastSequence: 4,
    hasMore: false,
    pendingTurn: null,
  };
  return transport.readConversationTranscript(
    { conversationId: binding.conversationId, after: 2, limit: 100 },
    new AbortController().signal,
    async () => Response.json(value),
  );
}
function mount(
  cache: QueryClient,
  page?: transport.ConversationTranscriptPage,
) {
  const open = vi.fn();
  function Probe() {
    useConversationTurn(account, clientId, binding.conversationId, open, page);
    return null;
  }
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: cache }, createElement(Probe)),
  );
  for (const effect of effects.splice(0)) effect();
  return open;
}
afterEach(() => {
  effects.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "scope/reload automatically acknowledges the exact completed request without writes (explicit model: %s)",
  async (explicit) => {
    const storage = memory(),
      oldCache = new QueryClient();
    const original = conversationTurnJournal(
      oldCache,
      account,
      clientId,
      binding.conversationId,
      storage,
    );
    original.start(
      binding,
      prompt,
      nextRequestId,
      explicit ? selection : undefined,
    );
    oldCache.clear(); // Returning with a replaced scope/query cache restores only the original intent.
    const cache = new QueryClient(),
      journal = conversationTurnJournal(
        cache,
        account,
        clientId,
        binding.conversationId,
        storage,
      );
    const page = await completedPage(),
      reserve = vi.spyOn(transport, "reserveConversationTurn");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    try {
      expect(journal.read()?.state).toBe("unknown");
      expect(
        sessionHistoryState(
          { current: page },
          nextBinding.runId,
          [],
          journal.read(),
          false,
        ).recoveryNeeded,
      ).toBe(true);
      const open = mount(cache, page);
      await vi.waitFor(() => expect(journal.read()).toBeUndefined());
      const view = sessionHistoryState(
        { current: page },
        nextBinding.runId,
        [],
        journal.read(),
        false,
      );
      expect(view.nextBlocked).toBeUndefined();
      expect(view.source).toEqual(nextBinding);
      expect(
        view.savedCurrent?.messages.map((message) => message.text),
      ).toEqual(["Retained answer"]);
      expect(open).not.toHaveBeenCalled();
      expect(reserve).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
      const reloaded = new QueryClient();
      try {
        expect(
          conversationTurnJournal(
            reloaded,
            account,
            clientId,
            binding.conversationId,
            storage,
          ).read(),
        ).toBeUndefined();
      } finally {
        reloaded.clear();
      }
      expect(() =>
        journal.start(
          nextBinding,
          "Genuinely new draft",
          "a0000000-0000-4000-8000-00000000000c",
        ),
      ).not.toThrow();
    } finally {
      cache.clear();
    }
  },
);

it.each([
  "unavailable",
  "queued",
  "running",
  "request",
  "prompt",
  "model",
  "tenant",
  "client",
  "pending",
])("keeps %s completion evidence fenced", async (mismatch) => {
  const storage = memory(),
    cache = new QueryClient(),
    journal = conversationTurnJournal(
      cache,
      account,
      clientId,
      binding.conversationId,
      storage,
    );
  journal.start(binding, prompt, nextRequestId, selection);
  const original = journal.read();
  let page = structuredClone(await completedPage());
  if (mismatch === "queued" || mismatch === "running")
    page.latestRun.state = page.turns[0]!.run.state = mismatch;
  if (mismatch === "request")
    page.turns[0]!.request.requestId = "a0000000-0000-4000-8000-00000000000d";
  if (mismatch === "prompt")
    page.turns[0]!.request.prompt = "Different request";
  if (mismatch === "model")
    page.turns[0]!.request.modelSelection = { ...selection, effort: "low" };
  if (mismatch === "tenant") page.conversation.owner.tenantId = "foreign";
  if (mismatch === "client")
    page.conversation.scopes[0]!.resourceId =
      "a0000000-0000-4000-8000-00000000000e";
  if (mismatch === "pending")
    page = {
      ...page,
      pendingTurn: {
        sourceBinding: binding,
        targetBinding: nextBinding,
        state: "RESERVED",
      },
    };
  const reserve = vi.spyOn(transport, "reserveConversationTurn"),
    fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  try {
    mount(cache, mismatch === "unavailable" ? undefined : page);
    await Promise.resolve();
    expect(journal.read()).toBe(original);
    expect(reserve).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    cache.clear();
  }
});

it("late reservation completion cannot recreate an acknowledged or retired intent", async () => {
  const storage = memory(),
    cache = new QueryClient(),
    journal = conversationTurnJournal(
      cache,
      account,
      clientId,
      binding.conversationId,
      storage,
    );
  journal.start(binding, prompt, nextRequestId);
  const page = await completedPage();
  let release!: () => void;
  const pending = recoverConversationTurn(journal, async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return {
      schema: "meri.conversation-turn/1",
      sourceBinding: binding,
      targetBinding: nextBinding,
      state: "ACCEPTED",
      replayed: true,
    };
  });
  try {
    expect(journal.acknowledgeCompleted(page)).toBe(true);
    release();
    await expect(pending).rejects.toThrow("Turn scope changed");
    expect(journal.read()).toBeUndefined();
    journal.start(nextBinding, prompt, nextRequestId);
    clearMeriConversationScope(scope, storage);
    expect(journal.acknowledgeCompleted(page)).toBe(false);
  } finally {
    cache.clear();
  }
});

it("failed storage deletion preserves the unresolved intent", async () => {
  const storage = memory(),
    cache = new QueryClient(),
    journal = conversationTurnJournal(
      cache,
      account,
      clientId,
      binding.conversationId,
      storage,
    );
  journal.start(binding, prompt, nextRequestId);
  const original = journal.read();
  const page = await completedPage();
  storage.removeItem = () => {};
  try {
    expect(() => journal.acknowledgeCompleted(page)).toThrow();
    expect(journal.read()).toBe(original);
  } finally {
    cache.clear();
  }
});
