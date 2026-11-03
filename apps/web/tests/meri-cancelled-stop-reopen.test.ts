import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import { useLiveRun } from "../src/features/meri/conversation/useLiveRun";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import {
  reconcileStoredCancel,
  type IntentRecord,
} from "../src/features/meri/conversation/run-commands";
import {
  conversationIntentJournal,
  type ConversationIntent,
} from "../src/shared/meri-conversations/query-journal";
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

/**
 * VQA-028: a definitively cancelled run that is reopened must not keep asking the person to repeat
 * a Stop that has nothing left to stop. A stop record belongs to one exact run and ends with it;
 * only that run's admitted terminal state retires it, and only a receipt may say what Stop did.
 */
const harness = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  observe: vi.fn(),
  stop: vi.fn(),
  restart: vi.fn(),
  afterDecision: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => {
    harness.effects.push(effect);
  },
}));
// One synthetic session: observation is not what this boundary decides, so it stays out of it.
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

const stored = history().request;
const retained = {
  requestId: stored.requestId,
  prompt: stored.prompt,
  state: "observed" as const,
};
const dispose: Array<() => void> = [];
beforeEach(() => {
  harness.effects = [];
  harness.observe.mockClear();
  harness.stop.mockClear();
  harness.restart.mockClear();
  harness.afterDecision.mockClear();
});
afterEach(() => {
  for (const cleanup of dispose.splice(0)) cleanup();
  vi.unstubAllGlobals();
});

type CancelAnswer = "cancelled" | "completed" | "lost";

/**
 * One reopened conversation: this tab's own stop record survives in session storage, a fresh
 * authorized port reads the exact run's admitted history, and the run reports the given state.
 */
function mount(options: {
  state: () => "running" | "cancelled";
  storedCancel?: "observed" | "unknown";
  cancel?: CancelAnswer;
  readFails?: boolean;
  foreignRun?: boolean;
}) {
  const storage = memoryStorage();
  syncMeriTabIdentity("synthetic-vqa028-session", storage);
  vi.stubGlobal("window", { sessionStorage: storage });
  const previous = new QueryClient();
  conversationIntentJournal(previous, context, storage).write({
    submit: retained,
    ...(options.storedCancel ? { cancel: options.storedCancel } : {}),
  });
  // A reload: the query cache is gone, this tab's session storage record is all that is left.
  previous.clear();
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
      const path = String(url);
      calls.push(path);
      if (path.endsWith("/history")) {
        if (options.readFails)
          return Response.json(
            { error: { code: "PRODUCT_UNAVAILABLE" } },
            { status: 502 },
          );
        const state = options.state();
        if (options.foreignRun)
          // A run this exact context did not bind: the public client refuses it.
          return Response.json({
            ...history([]),
            run: runFor(state, {
              ...binding,
              runId: "40000000-0000-4000-8000-000000000099",
            }),
          });
        return Response.json(
          history([status(1, state)], { state, prompt: stored.prompt }),
        );
      }
      if (path.endsWith("/cancel")) {
        if (options.cancel === "lost")
          throw new Error("synthetic transport loss");
        return Response.json({
          state: options.cancel === "completed" ? "completed" : "cancelled",
        });
      }
      throw new Error(`Unexpected synthetic operation ${path}`);
    },
  });
  const port = { ...sdk, context } as MeriConversationPort;
  dispose.push(() => {
    sdk.dispose();
    cache.clear();
  });
  let run!: ReturnType<typeof useLiveRun>;
  function Probe() {
    run = useLiveRun(port, undefined, stored);
    return null as unknown as ReactNode;
  }
  const render = () =>
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(Probe),
      ),
    );
  /** The mocked React keeps queued effects; the first pass is the reopened page's own read. */
  const runQueued = () => {
    for (const effect of harness.effects.splice(0)) effect();
  };
  render();
  return {
    get run() {
      return run;
    },
    port,
    journal: conversationIntentJournal(cache, context, storage),
    calls,
    /** Read the exact run's history as a reopened page does. */
    start() {
      runQueued();
      return vi.waitFor(() =>
        expect(["ready", "unavailable"]).toContain(port.getSnapshot().status),
      );
    },
    /** Re-render the settled state and run the command boundaries again, never a re-read. */
    async settle() {
      render();
      // useLiveRun declares its mount read first and its command boundaries last (stop settlement,
      // then accepted-request reconciliation); only those two run again against the settled state.
      for (const effect of harness.effects.splice(0).slice(-2)) {
        effect();
        // One command at a time: the next boundary must not be dropped as a concurrent command.
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    },
    stopCard(active: boolean) {
      render();
      const html = renderToStaticMarkup(
        createElement(RunStatus, { run, active }),
      );
      // The card's own effects are not this test's subject and must not join the queued boundaries.
      harness.effects.length = 0;
      return html;
    },
  };
}

it("reopening a definitively cancelled run retires its stale stop request instead of offering it again", async () => {
  const mounted = mount({ state: () => "cancelled", storedCancel: "observed" });
  // Cold recovery of this tab's own acknowledged stop reads it as unresolved.
  expect(mounted.journal.read().cancel).toBe("unknown");
  await mounted.start();
  expect(mounted.port.getSnapshot().observation?.runState).toBe("cancelled");
  await mounted.settle();
  const html = mounted.stopCard(false);
  expect(html).not.toContain("Stop request uncertain");
  expect(html).not.toContain("Retry Stop");
  expect(html).not.toContain('aria-label="Stop status"');
  // The record itself is retired: readiness and the card agree with the outcome, not a hidden card.
  expect(mounted.journal.read().cancel).toBeUndefined();
  expect(mounted.journal.read().submit).toMatchObject({ state: "observed" });
  // Nothing was sent and no control command was repeated.
  expect(
    mounted.calls.filter(
      (path) => path.endsWith("/cancel") || path.endsWith("/submit"),
    ),
  ).toEqual([]);
});

it("a stop whose response was lost retires when the same run's terminal state arrives", async () => {
  let state: "running" | "cancelled" = "running";
  const mounted = mount({ state: () => state, cancel: "lost" });
  await mounted.start();
  expect(mounted.port.getSnapshot().observation?.runState).toBe("running");
  await mounted.run.cancel();
  expect(mounted.journal.read().cancel).toBe("unknown");
  expect(mounted.stopCard(true)).toContain("Stop request uncertain");
  state = "cancelled";
  await mounted.run.history();
  expect(mounted.port.getSnapshot().observation?.runState).toBe("cancelled");
  await mounted.settle();
  const html = mounted.stopCard(false);
  expect(html).not.toContain("Stop request uncertain");
  expect(html).not.toContain("Retry Stop");
  expect(mounted.journal.read().cancel).toBeUndefined();
  // The lost Stop was never repeated: one request, no automatic retry of any control command.
  expect(mounted.calls.filter((path) => path.endsWith("/cancel"))).toHaveLength(
    1,
  );
});

it("an unsettled run keeps its stop uncertainty and its explicit retry", async () => {
  const mounted = mount({ state: () => "running", cancel: "lost" });
  await mounted.start();
  await mounted.run.cancel();
  await mounted.settle();
  expect(mounted.journal.read().cancel).toBe("unknown");
  const html = mounted.stopCard(true);
  expect(html).toContain("Stop request uncertain");
  expect(html).toContain("Retry Stop");
  expect(mounted.calls.filter((path) => path.endsWith("/cancel"))).toHaveLength(
    1,
  );
  expect(mounted.calls.filter((path) => path.endsWith("/submit"))).toEqual([]);
});

it.each([
  ["a failed read", { readFails: true }],
  ["foreign run history", { foreignRun: true }],
])(
  "%s leaves the stop unresolved: no admitted evidence for this exact run and bound",
  async (_name, evidence) => {
    const mounted = mount({
      state: () => "cancelled",
      storedCancel: "unknown",
      ...evidence,
    });
    await mounted.start();
    expect(mounted.port.getSnapshot().status).toBe("unavailable");
    expect(mounted.port.getSnapshot().observation).toBeNull();
    await mounted.settle();
    expect(mounted.journal.read().cancel).toBe("unknown");
    expect(
      mounted.calls.filter(
        (path) => path.endsWith("/cancel") || path.endsWith("/submit"),
      ),
    ).toEqual([]);
  },
);

it("control's own receipt still says what Stop did after the run settled", async () => {
  const mounted = mount({
    state: () => "cancelled",
    storedCancel: "observed",
    cancel: "completed",
  });
  await mounted.start();
  await mounted.run.cancel();
  await mounted.settle();
  expect(mounted.journal.read().cancel).toBe("observed");
  const html = mounted.stopCard(false);
  expect(html).toContain("Run already completed");
  expect(html).toContain(
    "The run had already completed when the stop request arrived.",
  );
  expect(html).not.toContain("Retry Stop");
});

/** The exact boundary, isolated: only terminal admitted evidence for the bound run retires a stop. */
function record(intent: ConversationIntent) {
  const written: ConversationIntent[] = [];
  const intentRecord: IntentRecord = {
    read: () => intent,
    write: (value) => {
      written.push(value);
    },
  };
  return { written, intentRecord };
}
const snapshotOf = (
  runState: string | undefined,
  extra: Record<string, unknown> = {},
) =>
  ({
    status: runState === undefined ? "unavailable" : "ready",
    observation: runState === undefined ? null : { runState },
    cancel: "idle",
    cancelReceipt: null,
    acceptedRequest: null,
    ...extra,
  }) as unknown as ReturnType<MeriConversationPort["getSnapshot"]>;

it.each(["completed", "failed", "cancelled"])(
  "a %s run retires an unresolved stop with no receipt",
  (runState) => {
    const { written, intentRecord } = record({
      submit: retained as never,
      cancel: "unknown",
    });
    const port = {
      getSnapshot: () => snapshotOf(runState),
    } as unknown as MeriConversationPort;
    expect(reconcileStoredCancel(port, intentRecord)).toBe(true);
    expect(written).toEqual([{ submit: retained }]);
  },
);

it.each([
  ["a live run", snapshotOf("running")],
  ["a paused run", snapshotOf("paused")],
  ["a run awaiting approval", snapshotOf("waiting-for-approval")],
  ["no admitted run", snapshotOf(undefined)],
  ["a run mid-Stop", snapshotOf("cancelled", { cancel: "pending" })],
  [
    "a run Stop already answered for",
    snapshotOf("cancelled", { cancelReceipt: { state: "completed" } }),
  ],
])("does not retire a stop on %s", (_name, snapshot) => {
  const { written, intentRecord } = record({ cancel: "unknown" });
  const port = {
    getSnapshot: () => snapshot,
  } as unknown as MeriConversationPort;
  expect(reconcileStoredCancel(port, intentRecord)).toBe(false);
  expect(written).toEqual([]);
});

it("writes nothing when this tab holds no unresolved stop", () => {
  for (const cancel of [undefined, "observed"] as const) {
    const { written, intentRecord } = record({
      submit: retained as never,
      ...(cancel ? { cancel } : {}),
    });
    const port = {
      getSnapshot: () => snapshotOf("cancelled"),
    } as unknown as MeriConversationPort;
    expect(reconcileStoredCancel(port, intentRecord)).toBe(false);
    expect(written).toEqual([]);
  }
});
