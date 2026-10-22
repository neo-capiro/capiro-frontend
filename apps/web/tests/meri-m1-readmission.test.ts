import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import { useLiveRun } from "../src/features/meri/conversation/useLiveRun";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import {
  binding,
  context,
  history,
  runFor,
  status,
} from "../test/browser/meri-conversation-fixtures";

const harness = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  observe: vi.fn(),
  stop: vi.fn(),
  restart: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => {
    harness.effects.push(effect);
  },
}));
vi.mock("../src/features/meri/conversation/useRunObservation", () => ({
  useRunObservation: () => ({ state: "idle", ...harness }),
}));

function memoryStorage(): TabStorage {
  const values = new Map<string, string>();
  return {
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
}
const request = history().request;
const retained = {
  requestId: request.requestId,
  prompt: request.prompt,
  state: "unknown" as const,
  workflow: "initial" as const,
};
const dispose: Array<() => void> = [];
beforeEach(() => {
  harness.effects = [];
  harness.observe.mockClear();
  harness.stop.mockClear();
  harness.restart.mockClear();
});
afterEach(() => {
  for (const cleanup of dispose.splice(0)) cleanup();
  vi.unstubAllGlobals();
});

function mount(response: () => Response) {
  const storage = memoryStorage();
  syncMeriTabIdentity("synthetic-readmission-session", storage);
  vi.stubGlobal("window", { sessionStorage: storage });
  const oldCache = new QueryClient();
  conversationIntentJournal(oldCache, context, storage).write({
    submit: { ...retained, state: "observed" },
  });
  oldCache.clear();
  const cache = new QueryClient();
  const calls: string[] = [];
  const sdk = createMeriConversation({
    context,
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    signal: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: vi.fn(),
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).endsWith("/history")) return response();
      if (String(url).endsWith("/cancel"))
        return Response.json({ state: "cancelled" });
      throw new Error(`Unexpected synthetic operation ${url}`);
    },
  });
  const port = { ...sdk, context } as MeriConversationPort;
  dispose.push(() => {
    sdk.dispose();
    cache.clear();
  });
  let run!: ReturnType<typeof useLiveRun>;
  function Probe() {
    run = useLiveRun(port, undefined, request);
    return null;
  }
  const render = () =>
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(Probe),
      ),
    );
  render();
  const journal = conversationIntentJournal(cache, context, storage);
  return { run, port, calls, journal, render };
}

it("reload reads exact-run SDK history before explicit Stop without replaying the stored input", async () => {
  const mounted = mount(() => Response.json(history([status(1, "running")])));
  expect(mounted.journal.read().submit).toEqual(retained);
  expect(mounted.calls).toEqual([]);
  for (const effect of harness.effects.splice(0)) effect();
  await vi.waitFor(() =>
    expect(mounted.port.getSnapshot().status).toBe("ready"),
  );
  expect(mounted.calls).toEqual(["/api/conversations/history"]);
  expect(harness.observe).toHaveBeenCalledOnce();
  // Render the completed read, then run only its reconciliation effect.
  mounted.render();
  harness.effects.at(-1)!();
  await vi.waitFor(() =>
    expect(mounted.journal.read().submit?.state).toBe("observed"),
  );
  expect(mounted.calls).toEqual(["/api/conversations/history"]);
  await mounted.run.cancel();
  expect(mounted.calls).toEqual([
    "/api/conversations/history",
    "/api/conversations/cancel",
  ]);
  expect(mounted.journal.read().submit).toEqual({
    ...retained,
    state: "observed",
  });
});

it("missing or foreign history never admits Stop or converts retained uncertainty into authority", async () => {
  for (const response of [
    () => Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 }),
    () =>
      Response.json({
        ...history([]),
        run: runFor("running", {
          ...binding,
          runId: "40000000-0000-4000-8000-000000000099",
        }),
      }),
  ]) {
    harness.effects = [];
    const mounted = mount(response);
    for (const effect of harness.effects.splice(0)) effect();
    await vi.waitFor(() =>
      expect(mounted.port.getSnapshot().status).toBe("unavailable"),
    );
    await mounted.run.cancel();
    expect(mounted.calls).toEqual(["/api/conversations/history"]);
    expect(mounted.journal.read().submit).toEqual(retained);
    expect(harness.observe).not.toHaveBeenCalled();
  }
});

it("queued positive history offers explicit same-request continuation while preserving mismatch refusal", () => {
  const run = {
    snapshot: { observation: { runState: "queued" } },
    intent: { submit: retained },
    busy: false,
    transcript: "loaded",
    observing: "idle",
    history: vi.fn(),
    submit: vi.fn(),
    recover: vi.fn(),
  } as unknown as ReturnType<typeof useLiveRun>;
  const render = (acceptedRequest: typeof request) =>
    renderToStaticMarkup(
      createElement(RunStatus, { run, active: true, acceptedRequest }),
    );
  expect(render(request)).toContain("Continue accepted request");
  expect(render(request)).not.toContain("Retry same request");
  const mismatch = render({ ...request, prompt: "Different accepted input" });
  expect(mismatch).not.toContain("Continue accepted request");
  expect(mismatch).toContain("Retry same request");
  expect(run.recover).not.toHaveBeenCalled();
  expect(run.submit).not.toHaveBeenCalled();
});
