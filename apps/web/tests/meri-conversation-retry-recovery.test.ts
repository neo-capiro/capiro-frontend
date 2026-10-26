/**
 * Safe exact-run recovery — mounted hook/lifetime determination against the IMMUTABLE frontend base
 * 858f06790d30216ad1070cab1768b192087d6c14c... (this checkout). No PR172 delta is applied here.
 *
 * Purpose: establish with mounted evidence, not assertion-by-reading, whether the current base needs a
 * production frontend change for the three reviewed findings, and that the retry path can never widen a
 * selection, reserve a successor, or dispatch a submit/model call merely to recover access.
 *
 * Seam: the repository's existing SSR/effect-capture style. `react`'s effects are captured, not run, so no
 * host connect, no fetch, no browser and no session issuance happens. Storage is synthetic in-memory.
 */
import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";

const h = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  hosts: [] as Array<Record<string, unknown>>,
  reason: null as string | null,
  status: "ready" as "ready" | "expired" | "connecting",
  fetches: 0,
}));

vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => {
    h.effects.push(effect);
  },
  useLayoutEffect: (effect: () => void) => {
    h.effects.push(effect);
  },
}));

vi.mock("../src/shared/meri-conversations/host-controller", () => {
  const snapshot = () => ({ status: h.status });
  class ConversationHostController {
    constructor(options: Record<string, unknown>) {
      h.hosts.push(options);
    }
    setClientAvailable() {}
    attach() {
      return () => {};
    }
    connect() {
      return Promise.resolve();
    }
    subscribe() {
      return () => {};
    }
    getSnapshot() {
      return snapshot();
    }
    revoke() {}
    getExpirationReason() {
      return h.reason;
    }
  }
  return { ConversationHostController };
});

const { useConversationConnection } = await import(
  "../src/features/meri/conversation/useConversationConnection"
);
const { useConversationHistory } = await import(
  "../src/shared/meri-conversations/history-queries"
);

const account = { tenantId: "synthetic-recovery-tenant", actorId: "synthetic-recovery-actor" };
const conversationId = "20000000-0000-4000-8000-000000000001";
const runId = "30000000-0000-4000-8000-000000000001";
const clientId = "50000000-0000-4000-8000-000000000005";
const exactContext = { ...account, selectedClientId: clientId, conversationId, runId };

afterEach(() => {
  vi.unstubAllGlobals();
  h.effects = [];
  h.hosts = [];
  h.reason = null;
  h.status = "ready";
  h.fetches = 0;
});

function storageFixture() {
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
  syncMeriTabIdentity("synthetic-recovery-session", storage);
  vi.stubGlobal("window", { sessionStorage: storage });
  vi.stubGlobal("fetch", () => {
    h.fetches += 1;
    throw new Error("network is not part of this seam");
  });
  return values;
}

function mount() {
  const cache = new QueryClient();
  let captured!: ReturnType<typeof useConversationConnection>;
  function Harness() {
    captured = useConversationConnection(account, clientId, () => 1000, conversationId);
    return null;
  }
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: cache }, createElement(Harness)),
  );
  return { cache, captured: () => captured };
}

/** The last created host's hints: what this tab would actually ask the service for. */
const lastHints = () => h.hosts.at(-1)!.hints as Record<string, unknown>;

it("retry keeps the exact bound run whether the session is expired or not", () => {
  storageFixture();
  const app = mount();
  const host = h.hosts.at(-1) as { onBound?: (context: unknown) => void };
  // The service bound this tab to one exact conversation/run before access was lost.
  host.onBound!(exactContext);
  expect(lastHints()).toEqual({ clientId, conversationId });

  h.reason = "access-lost";
  // A non-expired status must not fall back to the original, run-less opening hints.
  h.status = "ready";
  app.captured().retry();
  expect(lastHints()).toEqual({ clientId, conversationId, runId });

  // The expired status already preserved it; keep that as a regression guard.
  h.status = "expired";
  app.captured().retry();
  expect(lastHints()).toEqual({ clientId, conversationId, runId });
  expect(h.fetches).toBe(0);
});

it("an unreadable request journal is not evidence of no submission and cannot clear the exact run", () => {
  const values = storageFixture();
  const app = mount();
  (h.hosts.at(-1) as { onBound?: (context: unknown) => void }).onBound!(exactContext);
  // Corrupt every stored request record: the tab's own journal is now unreadable.
  for (const key of [...values.keys()])
    if (key.includes("request")) values.set(key, "{invalid-json");

  app.captured().retry();

  expect(lastHints()).toEqual({ clientId, conversationId, runId });
  expect(h.fetches).toBe(0);
});

it("disabled-history cleanup removes no recovery decision and exposes no server-authority boolean", () => {
  storageFixture();
  const app = mount();
  (h.hosts.at(-1) as { onBound?: (context: unknown) => void }).onBound!(exactContext);

  // The disabled history hook the previous candidate derived its recovery proof from.
  let history!: ReturnType<typeof useConversationHistory>;
  function HistoryHarness() {
    history = useConversationHistory(account, clientId, conversationId, false);
    return null;
  }
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: app.cache },
      createElement(HistoryHarness),
    ),
  );
  expect(Object.hasOwn(history, "unstarted")).toBe(false);
  expect(history.selected).toBe(true);

  // Execute the captured disabled-read cleanup effect for real, then retry again.
  const cleanup = h.effects.filter((effect) =>
    effect.toString().includes("clearConversationReads"),
  );
  expect(cleanup.length).toBeGreaterThan(0);
  for (const effect of cleanup) effect();

  app.captured().retry();

  expect(lastHints()).toEqual({ clientId, conversationId, runId });
  expect(h.fetches).toBe(0);
});

it("repeated access checks stay on the same exact selector and reserve nothing", () => {
  storageFixture();
  const app = mount();
  (h.hosts.at(-1) as { onBound?: (context: unknown) => void }).onBound!(exactContext);

  for (let i = 0; i < 3; i += 1) app.captured().retry();

  const asked = h.hosts.slice(1).map((entry) => entry.hints as Record<string, unknown>);
  expect(asked.length).toBeGreaterThanOrEqual(3);
  for (const hints of asked)
    expect(hints).toEqual({ clientId, conversationId, runId });
  expect(new Set(asked.map((hints) => hints.runId)).size).toBe(1);
  expect(h.fetches).toBe(0);
});
