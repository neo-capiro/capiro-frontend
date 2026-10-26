import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ComponentProps, ReactElement } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createMeriConversation } from "@capiro/meri-client/conversation";
import { MeriLiveConversation } from "../src/features/meri/conversation/MeriLiveConversation";
import { ConversationPanels } from "../src/features/meri/conversation/ConversationPanels";
import { ConversationIntents } from "../src/features/meri/conversation/intents/ConversationIntents";
import type { useConversationIntents } from "../src/features/meri/conversation/intents/useConversationIntents";
import type { useLiveRun } from "../src/features/meri/conversation/useLiveRun";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";
import type { ListState } from "../src/features/meri/conversation/intents/useIntentList";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import { nativeTaskIntent } from "./meri-intents-native-fixtures";
import {
  binding,
  context,
  history,
  status,
  stream,
} from "../test/browser/meri-conversation-fixtures";

// Execute the real mounted prop chain, run commands, public history receiver and
// SDK stream. Only unrelated composer/lifecycle and decision-journal IO are replaced.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  pending: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  dirty: false,
  mounted: false,
  onStop: undefined as (() => void) | undefined,
  list: { status: "loading" } as ListState,
  refresh: vi.fn(async () => undefined),
  decide: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  cache: undefined as QueryClient | undefined,
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => hooks.cache,
}));
vi.mock("../src/features/meri/conversation/conversation-composer", () => ({
  useLiveComposer: (
    _channel: unknown,
    input: { controls: { onStop: () => void } },
  ) => {
    hooks.onStop = input.controls.onStop;
  },
}));
vi.mock("../src/features/meri/conversation/lifecycle/useRunLifecycle", () => ({
  useRunLifecycle: () => ({ busy: false }),
}));
vi.mock("../src/features/meri/conversation/intents/approvals-enabled", () => ({
  useIntentApprovalsEnabled: () => true,
}));
vi.mock("../src/features/meri/conversation/intents/useIntentList", () => ({
  useIntentList: () => ({
    list: hooks.list,
    refresh: hooks.refresh,
    retry: vi.fn(),
    loadMore: vi.fn(),
  }),
}));
vi.mock("../src/features/meri/conversation/intents/decision-recovery", () => ({
  intentDecisionRecovery: () => ({
    load: async () => null,
    matches: vi.fn(),
    observed: vi.fn(),
    decide: hooks.decide,
  }),
}));
vi.mock("react", async (original) => {
  const memo = (factory: () => unknown, dependencies: readonly unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as
      | { dependencies: readonly unknown[]; value: unknown }
      | undefined;
    if (
      !previous ||
      !dependencies.every((value, i) =>
        Object.is(value, previous.dependencies[i]),
      )
    )
      hooks.slots[index] = { dependencies, value: factory() };
    return (hooks.slots[index] as { value: unknown }).value;
  };
  const effect = (
    run: () => void | (() => void),
    dependencies: readonly unknown[],
  ) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as readonly unknown[] | undefined;
    if (
      previous &&
      dependencies.every((value, i) => Object.is(value, previous[i]))
    )
      return;
    hooks.slots[index] = dependencies;
    hooks.pending.push(() => {
      hooks.cleanups.get(index)?.();
      const cleanup = run();
      if (cleanup) hooks.cleanups.set(index, cleanup);
      else hooks.cleanups.delete(index);
    });
  };
  return {
    ...(await original<typeof import("react")>()),
    useMemo: memo,
    useCallback: (callback: unknown, dependencies: readonly unknown[]) =>
      memo(() => callback, dependencies),
    useEffect: effect,
    useLayoutEffect: effect,
    useRef(initial: unknown) {
      const index = hooks.cursor++;
      if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
      return hooks.slots[index];
    },
    useState(initial: unknown) {
      const index = hooks.cursor++;
      if (!(index in hooks.slots))
        hooks.slots[index] =
          typeof initial === "function" ? initial() : initial;
      return [
        hooks.slots[index],
        (value: unknown) => {
          const next =
            typeof value === "function" ? value(hooks.slots[index]) : value;
          if (!Object.is(next, hooks.slots[index])) hooks.dirty = true;
          hooks.slots[index] = next;
        },
      ];
    },
    useSyncExternalStore(
      subscribe: (changed: () => void) => () => void,
      snapshot: () => unknown,
    ) {
      effect(
        () =>
          subscribe(() => {
            hooks.dirty = true;
          }),
        [subscribe],
      );
      return snapshot();
    },
  };
});

const NOW = Date.parse("2026-10-26T18:00:00Z");
type Run = ReturnType<typeof useLiveRun>;
type Decisions = ReturnType<typeof useConversationIntents>;
let run: Run;
let decisions: Decisions;
let renderTree: () => void;
const dispose: Array<() => void> = [];
function unmount() {
  hooks.mounted = false;
  hooks.cleanups.forEach((cleanup) => cleanup());
  hooks.cleanups.clear();
}
async function flush() {
  for (let turn = 0; turn < 40; turn++) {
    if (hooks.dirty && hooks.mounted) {
      hooks.cursor = 0;
      hooks.dirty = false;
      renderTree();
      hooks.pending.splice(0).forEach((effect) => effect());
    }
    await Promise.resolve();
  }
}
async function advance(milliseconds: number) {
  await vi.advanceTimersByTimeAsync(milliseconds);
  await flush();
}
function storage(): TabStorage {
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
function task(runId = context.runId) {
  const item = nativeTaskIntent(true).response.intents[0];
  item.phase = "awaiting_approval";
  item.decision = null;
  item.execution = null;
  item.proposal.command.binding = { ...binding, runId };
  item.proposal.requiredApprover = {
    tenantId: context.tenantId,
    actorId: context.actorId,
  };
  item.proposal.expiresAt = new Date(NOW + 600_000).toISOString();
  return item;
}
function mountedTree(port: MeriConversationPort) {
  const props = {
    port,
    initialPrompt: undefined,
    earlier: [],
    scope: "synthetic-scope",
    draft: "",
    onDraft: vi.fn(),
    initialDraft: {
      acknowledge: () => false,
      error: () => undefined,
      hasPending: () => false,
    },
    textareaRef: { current: null },
    onNextTurn: vi.fn(),
    composer: {},
    onSettled: vi.fn(),
    onLifecycleTarget: vi.fn(),
  } as unknown as ComponentProps<typeof MeriLiveConversation>;
  return () => {
    const view = MeriLiveConversation(props);
    const statusView = view.props.status as ReactElement<{
      children: ReactElement<{ run: Run }>[];
    }>;
    run = statusView.props.children[1]!.props.run;
    const panel = view.props.files as ReactElement<
      ComponentProps<typeof ConversationPanels>
    >;
    const panels = ConversationPanels(panel.props);
    const intent = panels.props.children[1] as ReactElement<
      ComponentProps<typeof ConversationIntents>
    >;
    const intents = ConversationIntents(intent.props);
    const section = intents.props.children[0] as ReactElement<{
      children: ReactElement<Decisions>[];
    }>;
    decisions = section.props.children[1]!.props;
  };
}
async function mount(item = task()) {
  let reads = 0,
    subscriptions = 0,
    denied = false;
  let nextRead: (() => Promise<Response>) | undefined;
  let events: ReadableStreamDefaultController<Uint8Array> | undefined;
  const cancelled = vi.fn(),
    lost = vi.fn();
  const calls: string[] = [];
  const encoder = new TextEncoder();
  const lifetime = new AbortController();
  const client = createMeriConversation({
    context,
    credential: `action_session_${"a".repeat(43)}`,
    expiresAtMs: NOW + 600_000,
    signal: lifetime.signal,
    isCurrent: () => !lifetime.signal.aborted,
    onAccessLost: lost,
    fetchImpl: async (url) => {
      calls.push(String(url));
      if (String(url).endsWith("/history")) {
        reads++;
        if (denied)
          return Response.json(
            { error: { code: "ACCESS_DENIED" } },
            { status: 403 },
          );
        if (nextRead) {
          const read = nextRead;
          nextRead = undefined;
          return read();
        }
        return Response.json(
          history([status(1, "waiting-for-approval")], {
            state: "waiting-for-approval",
          }),
        );
      }
      if (String(url).endsWith("/cancel"))
        return Response.json({ state: "cancelled" });
      if (String(url).includes("/events/")) {
        subscriptions++;
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              events = controller;
            },
            cancel: cancelled,
          }),
          {
            headers: {
              "content-type": "text/event-stream",
              "x-vercel-ai-ui-message-stream": "v1",
            },
          },
        );
      }
      throw new Error(`Unexpected synthetic request ${url}`);
    },
  });
  const port = { ...client, context, intents: {} } as MeriConversationPort;
  dispose.push(() => {
    lifetime.abort();
    client.dispose();
  });
  hooks.list = {
    status: "ready",
    items: [item],
    next: null,
    loadingMore: false,
  };
  renderTree = mountedTree(port);
  hooks.mounted = true;
  hooks.dirty = true;
  await flush();
  expect(decisions.decisionsReady).toBe(true);
  expect(port.getSnapshot().observation?.runState).toBe("waiting-for-approval");
  return {
    port,
    lost,
    calls,
    cancelled,
    get reads() {
      return reads;
    },
    get subscriptions() {
      return subscriptions;
    },
    deferRead(read: () => Promise<Response>) {
      nextRead = read;
    },
    deny() {
      denied = true;
    },
    close(
      states: Array<
        "running" | "completed" | "paused" | "waiting-for-approval"
      > = [],
    ) {
      events!.enqueue(
        encoder.encode(
          stream(
            states.map((state, i) =>
              status(
                i + 1 + (port.getSnapshot().observation?.after ?? 0),
                state,
              ),
            ),
          ),
        ),
      );
      events!.close();
      events = undefined;
    },
    fail() {
      events!.error(new Error("Synthetic stream failure"));
      events = undefined;
    },
  };
}
async function decide() {
  await decisions.decide(decisions.rows[0]!, "approved");
  await flush();
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  hooks.cursor = 0;
  hooks.slots = [];
  hooks.pending = [];
  hooks.cleanups.clear();
  hooks.dirty = false;
  hooks.onStop = undefined;
  hooks.refresh.mockReset();
  hooks.refresh.mockResolvedValue(undefined);
  hooks.decide.mockReset();
  hooks.decide.mockResolvedValue({ kind: "ok", value: { status: "approved" } });
  hooks.cache = new QueryClient();
  const sessionStorage = storage();
  syncMeriTabIdentity("synthetic-run-refresh", sessionStorage);
  vi.stubGlobal("window", { sessionStorage });
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { visibilityState: "visible" }),
  );
});
afterEach(async () => {
  unmount();
  dispose.splice(0).forEach((cleanup) => cleanup());
  hooks.cache?.clear();
  await Promise.resolve();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("reads after an admitted decision through the mounted prop chain and observes delayed continuation", async () => {
  const f = await mount();
  expect(f.reads).toBe(1);
  expect(f.subscriptions).toBe(0);
  await decide();
  expect(f.reads).toBe(2);
  expect(f.subscriptions).toBe(1);
  await advance(5000);
  expect(run.snapshot.observation?.runState).toBe("waiting-for-approval");
  f.close(["running", "completed"]);
  await flush();
  expect(run.snapshot.observation?.runState).toBe("completed");
  expect(hooks.decide).toHaveBeenCalledTimes(1);
  expect(
    f.calls.every(
      (path) => path.endsWith("/history") || path.includes("/events/"),
    ),
  ).toBe(true);
});

it("ends an unchanged waiting window without polling and allows explicit read-only reconnect", async () => {
  const f = await mount();
  await decide();
  expect(f.subscriptions).toBe(1);
  await advance(30_000);
  f.close();
  await advance(0);
  expect(run.observing).toBe("stalled");
  expect(run.snapshot.observation?.runState).toBe("waiting-for-approval");
  await advance(60_000);
  expect(f.subscriptions).toBe(1);
  expect(f.reads).toBe(2);
  run.reconnect();
  await flush();
  expect(f.reads).toBe(3);
  expect(f.subscriptions).toBe(2);
  f.close(["completed"]);
  await flush();
  expect(run.snapshot.observation?.runState).toBe("completed");
  expect(hooks.decide).toHaveBeenCalledTimes(1);
});

it("uses the existing hard stream lease when the server never finishes", async () => {
  const f = await mount();
  await decide();
  expect(f.subscriptions).toBe(1);
  await advance(70_001);
  expect(run.observing).toBe("stalled");
  expect(f.cancelled).toHaveBeenCalled();
  await advance(10_000);
  expect(f.subscriptions).toBe(1);
});

it.each(["completed", "paused"] as const)(
  "keeps authoritative %s history settled without subscribing",
  async (state) => {
    const f = await mount();
    f.deferRead(async () =>
      Response.json(history([status(1, state)], { state })),
    );
    await decide();
    expect(f.reads).toBe(2);
    expect(f.subscriptions).toBe(0);
    expect(run.snapshot.observation?.runState).toBe(state);
  },
);

it("coalesces decision wakeup until the active history command completes", async () => {
  const f = await mount();
  let release!: (response: Response) => void;
  f.deferRead(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const previous = run.history();
  await flush();
  expect(run.busy).toBe(true);
  await decide();
  expect(f.reads).toBe(2);
  release(
    Response.json(
      history([status(1, "waiting-for-approval")], {
        state: "waiting-for-approval",
      }),
    ),
  );
  await previous;
  await flush();
  expect(f.reads).toBe(3);
  expect(f.subscriptions).toBe(1);
  f.close(["completed"]);
  await flush();
  expect(run.snapshot.observation?.runState).toBe("completed");
});

it("retires current data on denied history and never subscribes with the old identity", async () => {
  const f = await mount();
  f.deny();
  await decide();
  expect(f.reads).toBe(2);
  expect(f.lost).toHaveBeenCalledTimes(1);
  expect(f.port.getSnapshot().observation).toBeNull();
  expect(f.subscriptions).toBe(0);
  unmount();
  await advance(30_000);
  expect(f.reads).toBe(2);
});

it("ignores a late decision completion after identity/lifetime retirement", async () => {
  const f = await mount();
  let reply!: (value: unknown) => void;
  hooks.decide.mockImplementation(
    () =>
      new Promise((resolve) => {
        reply = resolve;
      }),
  );
  const pending = decisions.decide(decisions.rows[0]!, "approved");
  await flush();
  unmount();
  reply({ kind: "ok", value: { status: "approved" } });
  await pending;
  await flush();
  expect(f.reads).toBe(1);
  expect(f.subscriptions).toBe(0);
});

it("does not wake the current run for a different proposal run in the same conversation", async () => {
  const f = await mount(task("40000000-0000-4000-8000-000000000099"));
  await decide();
  expect(f.reads).toBe(1);
  expect(f.subscriptions).toBe(0);
});

it.each([
  { kind: "ok", value: { status: "indeterminate" } },
  { kind: "refused", code: "UNKNOWN" },
  { kind: "unavailable", dispatched: true },
])(
  "keeps unresolved decision $kind read-only without waking or reposting",
  async (reply) => {
    const f = await mount();
    hooks.decide.mockResolvedValue(reply);
    await decide();
    await advance(60_000);
    expect(f.reads).toBe(1);
    expect(f.subscriptions).toBe(0);
    expect(hooks.decide).toHaveBeenCalledTimes(1);
  },
);

it("suspending for Stop/Pause cancels the special stream without starting another one", async () => {
  const f = await mount();
  await decide();
  expect(f.subscriptions).toBe(1);
  run.suspendObservation();
  await flush();
  expect(f.cancelled).toHaveBeenCalled();
  await advance(60_000);
  expect(f.subscriptions).toBe(1);
});

it("unmount cancels observation and cannot revive the retired run", async () => {
  const f = await mount();
  await decide();
  expect(f.subscriptions).toBe(1);
  unmount();
  await flush();
  expect(f.cancelled).toHaveBeenCalled();
  await advance(60_000);
  expect(f.subscriptions).toBe(1);
  expect(f.reads).toBe(2);
});

it("does not mistake a paged history suffix for a new approval status", async () => {
  const f = await mount();
  f.deferRead(async () =>
    Response.json({
      ...history(
        Array.from({ length: 100 }, (_, i) =>
          status(i + 1, "waiting-for-approval"),
        ),
        {
          state: "waiting-for-approval",
        },
      ),
      hasMore: true,
      lastSequence: 102,
    }),
  );
  await decide();
  expect(f.subscriptions).toBe(1);
  f.close(["running", "waiting-for-approval"]);
  await advance(0);
  expect(run.snapshot.observation?.runState).toBe("waiting-for-approval");
  expect(run.observing).toBe("stalled");
  await advance(60_000);
  expect(f.subscriptions).toBe(1);
});

it("stops on a newly admitted approval wait instead of extending its special window", async () => {
  const f = await mount();
  await decide();
  f.close(["waiting-for-approval"]);
  await advance(0);
  expect(run.observing).toBe("settled");
  await advance(60_000);
  expect(f.subscriptions).toBe(1);
});

it("keeps a failed unchanged-wait subscription bounded without automatic retries", async () => {
  const f = await mount();
  await decide();
  f.fail();
  await advance(0);
  expect(run.observing).toBe("stalled");
  await advance(60_000);
  expect(f.subscriptions).toBe(1);
  expect(f.reads).toBe(2);
});

it("cancels a queued decision wakeup when Stop/Pause suspends before command completion", async () => {
  const f = await mount();
  let release!: (response: Response) => void;
  f.deferRead(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const previous = run.history();
  await flush();
  await decisions.decide(decisions.rows[0]!, "approved");
  // The callback has queued state but React has not rendered it yet.
  run.suspendObservation();
  await flush();
  release(
    Response.json(
      history([status(1, "waiting-for-approval")], {
        state: "waiting-for-approval",
      }),
    ),
  );
  await previous;
  await flush();
  expect(f.reads).toBe(2);
  expect(f.subscriptions).toBe(0);
});

it("refreshes a settled rejection without treating its receipt as a run outcome", async () => {
  const f = await mount();
  hooks.decide.mockResolvedValue({ kind: "ok", value: { status: "rejected" } });
  await decisions.decide(decisions.rows[0]!, "rejected");
  await flush();
  expect(f.reads).toBe(2);
  expect(f.subscriptions).toBe(1);
  expect(run.snapshot.observation?.runState).toBe("waiting-for-approval");
});

it("does not wake a retired identity if the decision's list refresh loses access", async () => {
  const f = await mount();
  hooks.refresh.mockImplementation(async () => {
    unmount();
  });
  await decide();
  expect(f.reads).toBe(1);
  expect(f.subscriptions).toBe(0);
});

it("actual mounted Stop cancels a decision wakeup queued before React rerenders", async () => {
  const f = await mount();
  await decisions.decide(decisions.rows[0]!, "approved");
  hooks.onStop!();
  await flush();
  expect(f.calls.filter((path) => path.endsWith("/cancel"))).toHaveLength(1);
  expect(f.reads).toBe(1);
  expect(f.subscriptions).toBe(0);
  expect(run.snapshot.cancelReceipt?.state).toBe("cancelled");
  expect(run.snapshot.observation?.runState).toBe("waiting-for-approval");
  await advance(60_000);
  expect(f.reads).toBe(1);
});

it("actual mounted Stop retires a post-decision stream without changing cancel recovery", async () => {
  const f = await mount();
  await decide();
  expect(f.subscriptions).toBe(1);
  hooks.onStop!();
  await flush();
  expect(f.cancelled).toHaveBeenCalled();
  expect(f.calls.filter((path) => path.endsWith("/cancel"))).toHaveLength(1);
  expect(run.snapshot.cancelReceipt?.state).toBe("cancelled");
  await advance(60_000);
  expect(f.reads).toBe(2);
  expect(f.subscriptions).toBe(1);
});

it("actual mounted Stop rejects a decision wakeup that completes after suspension", async () => {
  const f = await mount();
  let reply!: (value: unknown) => void;
  hooks.decide.mockImplementation(
    () =>
      new Promise((resolve) => {
        reply = resolve;
      }),
  );
  const pending = decisions.decide(decisions.rows[0]!, "approved");
  await flush();
  hooks.onStop!();
  await flush();
  reply({ kind: "ok", value: { status: "approved" } });
  await pending;
  await flush();
  expect(f.calls.filter((path) => path.endsWith("/cancel"))).toHaveLength(1);
  expect(f.reads).toBe(1);
  expect(f.subscriptions).toBe(0);
});
