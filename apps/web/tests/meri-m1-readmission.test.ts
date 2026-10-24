import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import { useLiveRun } from "../src/features/meri/conversation/useLiveRun";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { turnFromObservation } from "../src/features/meri/conversation/conversation-view";
import { conversationIntentJournal } from "../src/shared/meri-conversations/query-journal";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import type { Page, Route } from "@playwright/test";
import { installInitialInput } from "../test/browser/meri-initial-input-fixtures";
import {
  binding,
  context,
  event,
  history,
  runFor,
  status,
} from "../test/browser/meri-conversation-fixtures";

const harness = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  buttons: [] as Array<{
    children: ReactNode;
    disabled?: boolean;
    onClick: () => void;
  }>,
  observe: vi.fn(),
  stop: vi.fn(),
  restart: vi.fn(),
}));
vi.mock("@capiro/ui/button", () => ({
  Button: (props: (typeof harness.buttons)[number]) => {
    harness.buttons.push(props);
    return createElement(
      "button",
      { disabled: props.disabled },
      props.children,
    );
  },
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
  harness.buttons = [];
  harness.observe.mockClear();
  harness.stop.mockClear();
  harness.restart.mockClear();
});
afterEach(() => {
  for (const cleanup of dispose.splice(0)) cleanup();
  vi.unstubAllGlobals();
});

function mount(
  response: () => Response,
  navigation?: {
    initial: boolean;
    reload?: boolean;
    cache?: QueryClient;
    storage?: TabStorage;
    savedRequest?: boolean;
    fetchImpl: NonNullable<
      Parameters<typeof createMeriConversation>[0]["fetchImpl"]
    >;
  },
) {
  const storage = navigation?.storage ?? memoryStorage();
  syncMeriTabIdentity("synthetic-readmission-session", storage);
  vi.stubGlobal("window", { sessionStorage: storage });
  const oldCache = navigation?.cache ?? new QueryClient();
  conversationIntentJournal(oldCache, context, storage).write({
    submit: navigation
      ? {
          requestId: request.requestId,
          prompt: request.prompt,
          state: "unknown",
          ...(navigation.initial ? { workflow: "initial" as const } : {}),
        }
      : { ...retained, state: "observed" },
  });
  if (!navigation || navigation.reload) oldCache.clear();
  const cache = navigation && !navigation.reload ? oldCache : new QueryClient();
  const calls: string[] = [];
  const sdk = createMeriConversation({
    context,
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    signal: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: vi.fn(),
    fetchImpl: async (url, init) => {
      calls.push(String(url));
      if (navigation) return navigation.fetchImpl(url, init);
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
    run = useLiveRun(
      port,
      undefined,
      navigation?.savedRequest === false ? undefined : request,
    );
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
  return {
    get run() {
      return run;
    },
    port,
    cache,
    storage,
    calls,
    journal,
    render,
  };
}

/** Invoke the existing pinned browser fixture's handlers without a browser or network. */
async function acceptedInputFixture(submitted = true) {
  const handlers = new Map<string, (route: Route) => unknown>();
  const native = await installInitialInput({
    route: async (path: string, handler: (route: Route) => unknown) => {
      handlers.set(path.replace("**", ""), handler);
    },
  } as unknown as Page);
  const input = JSON.stringify({
    requestId: request.requestId,
    prompt: request.prompt,
  });
  const route = (body: string) =>
    ({
      request: () => ({
        postData: () => body,
        postDataJSON: () => JSON.parse(body),
      }),
    }) as unknown as Route;
  // The service accepted the original bytes before its response was lost.
  native.allocationResponse(route(input));
  native.admissionResponse(route(input));
  if (submitted) native.submitResponse(route(input));
  const fetchImpl: NonNullable<
    Parameters<typeof createMeriConversation>[0]["fetchImpl"]
  > = async (url, init) => {
    let response: Response | undefined;
    const handler = handlers.get(String(url));
    if (!handler) throw new Error(`Unexpected fixture operation ${url}`);
    await handler({
      ...route(String(init?.body)),
      fulfill: async (value: Parameters<Route["fulfill"]>[0]) => {
        if (!value) throw new Error("Missing fixture fulfillment");
        response = new Response(value.body as string, {
          status: value.status ?? 200,
          headers: { "content-type": value.contentType ?? "application/json" },
        });
      },
    } as unknown as Route);
    if (!response) throw new Error(`Missing fixture response ${url}`);
    return response;
  };
  return { ...native, input, fetchImpl };
}

it.each([
  { initial: false, readable: true },
  { initial: true, readable: true },
  { initial: false, readable: false },
  { initial: true, readable: false },
])(
  "navigation reads before explicit exact retry (initial: $initial, readable: $readable)",
  async ({ initial, readable }) => {
    const fixture = await acceptedInputFixture();
    let firstRead = true;
    const mounted = mount(() => Response.json(history()), {
      initial,
      savedRequest: false,
      fetchImpl: async (url, init) => {
        if (String(url).endsWith("/history") && firstRead) {
          firstRead = false;
          if (!readable)
            return Response.json(
              { error: { code: "PRODUCT_UNAVAILABLE" } },
              { status: 502 },
            );
        }
        return fixture.fetchImpl(url, init);
      },
    });
    const original = structuredClone(mounted.journal.read().submit);
    for (const effect of harness.effects.splice(0)) effect();
    await vi.waitFor(() =>
      expect(mounted.port.getSnapshot().status).toBe(
        readable ? "ready" : "unavailable",
      ),
    );
    expect(mounted.calls).toEqual(["/api/conversations/history"]);
    expect(mounted.journal.read().submit).toEqual(original);
    expect(mounted.port.getSnapshot().observation?.runState).toBe(
      readable ? "completed" : undefined,
    );
    renderToStaticMarkup(
      createElement(RunStatus, {
        run: mounted.run,
        active: true,
        acceptedRequest: request,
      }),
    );
    const retry = harness.buttons.find(
      (button) => button.children === "Retry same request",
    );
    expect(retry).toBeDefined();
    expect(retry!.disabled).toBe(false);
    retry!.onClick();
    await vi.waitFor(() =>
      expect(mounted.journal.read().submit?.state).toBe("observed"),
    );
    expect(mounted.calls).toEqual([
      "/api/conversations/history",
      ...(initial && !readable ? ["/api/conversations/input/allocate"] : []),
      "/api/conversations/input/admit",
      "/api/conversations/submit",
      "/api/conversations/history",
    ]);
    expect(fixture.calls.allocate).toHaveLength(initial && !readable ? 2 : 1);
    expect(fixture.calls.admit).toHaveLength(2);
    expect(fixture.calls.submit).toHaveLength(2);
    expect(
      new Set([
        ...fixture.calls.allocate,
        ...fixture.calls.admit,
        ...fixture.calls.submit,
      ]),
    ).toEqual(new Set([fixture.input]));
    expect(mounted.journal.read().submit).toEqual({
      ...original,
      state: "observed",
    });
  },
);

it("session replacement recovers the terminal answer with a cached unknown request and unavailable saved history", async () => {
  const terminal = history(
    [event(1, "Synthetic completed answer"), status(2, "completed")],
    { state: "completed" },
  );
  const response = () => Response.json(terminal);
  const fetchImpl = async () => response();
  const first = mount(response, {
    initial: true,
    savedRequest: false,
    fetchImpl,
  });
  // The current port already has a durable answer when its session is replaced.
  harness.effects = [];
  await first.port.history();
  expect(first.port.getSnapshot().observation?.runState).toBe("completed");
  const original = structuredClone(first.journal.read().submit);
  first.port.dispose();
  expect(first.port.getSnapshot().observation).toBeNull();

  const renewed = mount(response, {
    initial: true,
    savedRequest: false,
    cache: first.cache,
    storage: first.storage,
    fetchImpl,
  });
  expect(renewed.port.getSnapshot().observation).toBeNull();
  for (const effect of harness.effects.splice(0)) effect();
  await vi.waitFor(() =>
    expect(renewed.port.getSnapshot().observation?.runState).toBe("completed"),
  );
  const observed = renewed.port.getSnapshot().observation!;
  const turn = turnFromObservation(observed, renewed.port.context.runId);
  expect(turn.messages.map((message) => message.text)).toEqual([
    "Synthetic completed answer",
  ]);
  expect(first.calls).toEqual(["/api/conversations/history"]);
  expect(renewed.calls).toEqual(["/api/conversations/history"]);
  expect(renewed.journal.read().submit).toEqual(original);
  expect(renewed.journal.read().submit?.state).toBe("unknown");
});

it("reload of a lost admission reads queued history and continues only on the explicit same-input action", async () => {
  const fixture = await acceptedInputFixture(false);
  const mounted = mount(() => Response.json(history()), {
    initial: true,
    reload: true,
    fetchImpl: fixture.fetchImpl,
  });
  for (const effect of harness.effects.splice(0)) effect();
  await vi.waitFor(() =>
    expect(mounted.port.getSnapshot().status).toBe("ready"),
  );
  mounted.render();
  harness.effects.at(-1)!();
  expect(mounted.calls).toEqual(["/api/conversations/history"]);
  expect(mounted.journal.read().submit?.state).toBe("unknown");
  renderToStaticMarkup(
    createElement(RunStatus, {
      run: mounted.run,
      active: true,
      acceptedRequest: request,
    }),
  );
  const continuation = harness.buttons.find(
    (button) => button.children === "Continue accepted request",
  );
  expect(continuation).toBeDefined();
  expect(continuation!.disabled).toBe(false);
  expect(fixture.calls.submit).toEqual([]);
  continuation!.onClick();
  await vi.waitFor(() =>
    expect(mounted.journal.read().submit?.state).toBe("observed"),
  );
  expect(fixture.calls.allocate).toEqual([fixture.input]);
  expect(fixture.calls.admit).toEqual([fixture.input, fixture.input]);
  expect(fixture.calls.submit).toEqual([fixture.input]);
  expect(
    mounted.port
      .getSnapshot()
      .observation?.events.map((event) => event.binding),
  ).toEqual([binding]);
});

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
