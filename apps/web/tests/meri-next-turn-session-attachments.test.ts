import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationSession } from "../src/features/meri/conversation/useConversationSession";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { TurnView } from "../src/features/meri/conversation/conversation-view";
import {
  binding,
  nextBinding,
  clientId,
  contextFor,
} from "../test/browser/meri-conversation-fixtures";

// startNext and the release paths of the actual screen session, over a ready port whose composer is a spy. The turn
// command and its journal are exercised for real in meri-next-turn-attachments.test.ts.
const harness = vi.hoisted(() => ({
  start: vi.fn(),
  check: vi.fn(),
  discard: vi.fn(),
  uploads: {
    sendArgument: vi.fn(),
    sent: vi.fn(),
    offer: vi.fn(),
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock(
  "../src/features/meri/conversation/useConversationConnection",
  async () => {
    const { contextFor, binding } =
      await import("../test/browser/meri-conversation-fixtures");
    return {
      useConversationConnection: () => ({
        state: {
          status: "ready",
          port: { context: contextFor(binding), uploads: harness.uploads },
        },
        accessLost: false,
        unverified: false,
        storageError: undefined,
        conversationId: binding.conversationId,
        revoke: vi.fn(),
        reopen: vi.fn(),
        retry: vi.fn(),
      }),
    };
  },
);
vi.mock("../src/shared/meri-conversations/history-queries", () => ({
  useConversationHistory: () => ({
    query: { isPending: false, isRefetching: false },
    denied: false,
    current: undefined,
    refresh: vi.fn(),
  }),
}));
vi.mock("../src/features/meri/model-selection/useModelCatalog", () => ({
  useModelCatalog: () => ({ document: undefined }),
}));
vi.mock("../src/features/meri/conversation/useConversationTurn", () => ({
  useConversationTurn: () => ({
    busy: false,
    start: harness.start,
    check: harness.check,
    discard: harness.discard,
  }),
}));
vi.mock("../src/features/meri/conversation/saved-turns", async () => {
  const { binding, nextBinding } =
    await import("../test/browser/meri-conversation-fixtures");
  return {
    sessionHistoryState: () => ({
      source: binding,
      nextBlocked: undefined,
      acceptedRequest: undefined,
      reservation: { sourceBinding: binding, targetBinding: nextBinding },
    }),
  };
});

const account = { tenantId: binding.tenantId, actorId: binding.actorId };
const uploads = [
  { uploadId: "70000000-0000-4000-8000-000000000007", sha256: "a".repeat(64) },
];
let session: ReturnType<typeof useConversationSession>;
beforeEach(() => {
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
  vi.stubGlobal("window", { sessionStorage: storage });
  syncMeriTabIdentity("synthetic-signed-in", storage);
  vi.clearAllMocks();
  function Probe() {
    session = useConversationSession(account, clientId, binding.conversationId);
    return null;
  }
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(Probe),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

it("a follow-up hands the ready composer to the turn command and releases nothing itself", () => {
  expect(session.ready?.port.context).toEqual(contextFor(binding));
  session.startNext("Read the attached file", {
    runId: binding.runId,
  } as TurnView);
  expect(harness.start).toHaveBeenCalledExactlyOnceWith(
    binding,
    "Read the attached file",
    expect.any(Function),
    undefined,
    {},
    harness.uploads,
  );
  // Rows leave only when the turn command has retained them with the turn, never at the click.
  expect(harness.uploads.sent).not.toHaveBeenCalled();
});

it("check and discard of a released follow-up put its text and files back in the composer", async () => {
  await session.checkPending();
  await session.discardPending();
  expect(harness.check.mock.calls[0]![0]).toEqual(binding);
  expect(harness.discard.mock.calls[0]![0]).toBe(nextBinding.runId);
  for (const restore of [
    harness.check.mock.calls[0]![1],
    harness.discard.mock.calls[0]![1],
  ])
    restore("Read the attached file", uploads);
  expect(harness.uploads.offer.mock.calls).toEqual([[uploads], [uploads]]);
});
