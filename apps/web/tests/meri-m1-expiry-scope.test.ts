import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConversationSession } from "../src/features/meri/conversation/useConversationSession";
import { ConnectionPending } from "../src/features/meri/conversation/ConnectionPending";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { ActionContext } from "../src/shared/meri-actions/session-receipt";

const harness = vi.hoisted(() => ({
  bound: undefined as ActionContext | undefined,
  hints: [] as Array<Record<string, string>>,
  history: vi.fn(),
  reserve: vi.fn(),
}));
vi.mock("../src/shared/meri-conversations/host-controller", () => ({
  ConversationHostController: class {
    constructor(options: {
      hints: Record<string, string>;
      onBound: (context: ActionContext) => void;
    }) {
      harness.hints.push({ ...options.hints });
      // Model an already-validated binding whose short opaque lifetime ended.
      if (harness.bound) options.onBound(harness.bound);
    }
    subscribe = () => () => undefined;
    getSnapshot = () => ({ status: "expired" as const });
    getExpirationReason = () => "expiry" as const;
  },
}));
vi.mock("../src/shared/meri-conversations/history-queries", () => ({
  useConversationHistory: (...args: unknown[]) => {
    harness.history(...args);
    return {
      query: { isPending: true },
      tail: {},
      denied: false,
      selected: !!args[2],
      refresh: vi.fn(),
    };
  },
}));
vi.mock("../src/features/meri/conversation/useConversationTurn", () => ({
  useConversationTurn: () => ({ busy: false, start: harness.reserve }),
}));

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const scope = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-native-actor",
  clientId: id(1),
  conversationId: id(2),
};
const context = { ...scope, selectedClientId: scope.clientId, runId: id(3) };
const request = { requestId: id(4), prompt: "Original pending message" };
let storage: TabStorage;
let session: ReturnType<typeof useConversationSession>;
function render() {
  function Probe() {
    session = useConversationSession(scope, scope.clientId);
    return createElement(ConnectionPending, { session, scope: "Synthetic" });
  }
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(Probe),
    ),
  );
}
beforeEach(() => {
  const values = new Map<string, string>();
  storage = {
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
  vi.stubGlobal("window", { sessionStorage: storage });
  syncMeriTabIdentity("synthetic-session");
  harness.bound = context;
  harness.hints = [];
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

it("ordinary expiry without a URL selector retains the bound draft and retries only its exact run", () => {
  const draft = createInitialDraftOwner(scope, storage);
  draft.edit(request.prompt);
  draft.begin(context, request, draft.draft());
  const html = render();
  expect(harness.hints).toEqual([{ clientId: scope.clientId }]);
  expect(session.selectedId).toBe(scope.conversationId);
  expect(session.ready).toBeUndefined();
  expect(session.accessLost).toBe(false);
  expect(session.initialDraft.hasPending(context)).toBe(true);
  expect(html).toContain(request.prompt);
  expect(html.match(/<textarea[^>]*>/i)?.[0]).not.toMatch(/readonly/i);
  expect(
    html.match(/<button[^>]*aria-label="Send message"[^>]*>/i)?.[0],
  ).toMatch(/disabled/i);
  expect(harness.history).toHaveBeenCalledWith(
    scope,
    scope.clientId,
    scope.conversationId,
    true,
  );
  session.setDraft("Newer disconnected draft");
  expect(createInitialDraftOwner(scope, storage).draft()).toBe(
    "Newer disconnected draft",
  );
  session.connection.retry();
  expect(harness.hints).toEqual([
    { clientId: scope.clientId },
    {
      clientId: scope.clientId,
      conversationId: scope.conversationId,
      runId: context.runId,
    },
  ]);
  expect(harness.reserve).not.toHaveBeenCalled();
});

it("an unbound expired connection cannot select or recover an unrelated retained conversation", () => {
  createInitialDraftOwner(scope, storage).edit("Private unrelated draft");
  harness.bound = undefined;
  const html = render();
  expect(session.selectedId).toBeUndefined();
  expect(session.draft).toBe("");
  expect(html).not.toContain("Private unrelated draft");
  expect(html.match(/<textarea[^>]*>/i)?.[0]).toMatch(/readonly/i);
  expect(harness.reserve).not.toHaveBeenCalled();
});
