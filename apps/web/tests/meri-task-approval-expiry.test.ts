import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useConversationIntents as intentsHook } from "../src/features/meri/conversation/intents/useConversationIntents";
import type { IntentScope } from "../src/features/meri/conversation/intents/useConversationIntents";
import type { ListState } from "../src/features/meri/conversation/intents/useIntentList";
import type { IntentsAccess } from "../src/shared/meri-intents/access";
import { nativeTaskIntent } from "./meri-intents-native-fixtures";

// Controlled hook lifetimes exercise the real conversation projection. The
// existing durable journal is replaced only at its IO boundary; no writes or
// server refreshes are needed to expire the displayed proposal.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  pending: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  dirty: false,
  writes: 0,
  list: { status: "loading" } as ListState,
  refresh: vi.fn(async () => undefined),
  decide: vi.fn(async () => ({ kind: "unavailable", dispatched: false })),
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
vi.mock("react", () => {
  const memo = (factory: () => unknown, dependencies: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as
      | { dependencies: unknown[]; value: unknown }
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
  const effect = (run: () => void | (() => void), dependencies: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as unknown[] | undefined;
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
    useMemo: memo,
    useCallback: (callback: unknown, dependencies: unknown[]) =>
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
          hooks.writes++;
        },
      ];
    },
  };
});

const NOW = Date.parse("2026-10-26T18:00:00.000Z");
const access = { list: vi.fn(), decide: vi.fn() } as IntentsAccess;
const scope = {
  tenantId: "tenant",
  actorId: "actor",
  conversationId: "00000000-0000-4000-8000-000000000001",
};
let currentScope: IntentScope;
let current: ReturnType<typeof intentsHook>;
let documentEvents: EventTarget & { visibilityState: string };

function proposal(delay: number, n = 1) {
  const item = nativeTaskIntent(true).response.intents[0];
  item.phase = "awaiting_approval";
  item.decision = null;
  item.execution = null;
  item.proposal.expiresAt = new Date(NOW + delay).toISOString();
  item.proposal.proposalId = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  item.deliveryId = `sdk:${String(n).padStart(64, "0")}`;
  return item;
}
async function render() {
  for (let i = 0; i < 12; i++) {
    hooks.cursor = 0;
    hooks.dirty = false;
    current = intentsHook(access, currentScope);
    hooks.pending.splice(0).forEach((run) => run());
    for (let tick = 0; tick < 8; tick++) await Promise.resolve();
    if (!hooks.dirty) return current;
  }
  throw new Error("Unexpected repeating render");
}
async function advance(milliseconds: number) {
  await vi.advanceTimersByTimeAsync(milliseconds);
  if (hooks.dirty) await render();
}
async function mount(...items: ReturnType<typeof proposal>[]) {
  hooks.list = { status: "ready", items, next: null, loadingMore: false };
  await render();
  expect(current.decisionsReady).toBe(true);
}
function unmount() {
  hooks.cleanups.forEach((cleanup) => cleanup());
  hooks.cleanups.clear();
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  hooks.cursor = 0;
  hooks.slots = [];
  hooks.pending = [];
  hooks.cleanups.clear();
  hooks.writes = 0;
  hooks.refresh.mockClear();
  hooks.decide.mockClear();
  currentScope = scope;
  documentEvents = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  vi.stubGlobal("document", documentEvents);
});
afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("offers the exact task decision until the deadline and closes it at expiry without HTTP", async () => {
  await mount(proposal(1000));
  expect(current.rows[0]?.decision).toBe("approvable");
  await advance(999);
  expect(current.rows[0]?.decision).toBe("approvable");
  await advance(1);
  expect(current.rows[0]).toMatchObject({
    decision: "closed",
    status: "Expired",
  });
  expect(current.rows[0]?.detail).toContain(
    "expiry does not confirm that nothing ran",
  );
  expect(hooks.decide).not.toHaveBeenCalled();
  expect(hooks.refresh).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("schedules only the next pending deadline and then advances to the next task", async () => {
  await mount(proposal(3000, 2), proposal(1000, 1));
  expect(vi.getTimerCount()).toBe(1);
  await advance(1000);
  expect(
    current.rows.filter((row) => row.decision === "approvable"),
  ).toHaveLength(1);
  expect(vi.getTimerCount()).toBe(1);
  await advance(2000);
  expect(current.rows.every((row) => row.decision === "closed")).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("recomputes expiry when a throttled tab becomes visible without redispatch or refresh", async () => {
  await mount(proposal(1000));
  vi.setSystemTime(NOW + 5000);
  documentEvents.visibilityState = "hidden";
  documentEvents.dispatchEvent(new Event("visibilitychange"));
  expect(hooks.dirty).toBe(false);
  documentEvents.visibilityState = "visible";
  documentEvents.dispatchEvent(new Event("visibilitychange"));
  if (hooks.dirty) await render();
  expect(current.rows[0]?.decision).toBe("closed");
  expect(vi.getTimerCount()).toBe(0);
  expect(hooks.decide).not.toHaveBeenCalled();
  expect(hooks.refresh).not.toHaveBeenCalled();
});

it("replaces the old deadline when current proposal content changes", async () => {
  await mount(proposal(1000));
  hooks.list = {
    status: "ready",
    items: [proposal(5000)],
    next: null,
    loadingMore: false,
  };
  await render();
  await advance(1000);
  expect(current.rows[0]?.decision).toBe("approvable");
  await advance(4000);
  expect(current.rows[0]?.decision).toBe("closed");
});

it("cleans the old identity's timer and listener before showing another reviewer", async () => {
  await mount(proposal(1000));
  const removed = vi.spyOn(documentEvents, "removeEventListener");
  currentScope = { ...scope, actorId: "other-reviewer" };
  await render();
  expect(removed).toHaveBeenCalledWith(
    "visibilitychange",
    expect.any(Function),
  );
  expect(vi.getTimerCount()).toBe(1);
  expect(current.rows[0]?.status).toBe("Needs another approver");
  await advance(1000);
  expect(current.rows[0]?.decision).toBe("closed");
  expect(hooks.decide).not.toHaveBeenCalled();
});

it("cancels timers and listeners on access loss or unmount", async () => {
  await mount(proposal(1000));
  hooks.list = { status: "unavailable" };
  await render();
  expect(vi.getTimerCount()).toBe(0);
  expect(current.rows).toEqual([]);
  await mount(proposal(5000));
  unmount();
  const writes = hooks.writes;
  await advance(10_000);
  documentEvents.dispatchEvent(new Event("visibilitychange"));
  expect(hooks.writes).toBe(writes);
  expect(vi.getTimerCount()).toBe(0);
});

it("does not keep scheduling already expired or settled tasks", async () => {
  const settled = proposal(5000, 2);
  settled.phase = "rejected";
  await mount(proposal(-1), settled);
  expect(current.rows.every((row) => row.decision === "closed")).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  await advance(60_000);
  expect(hooks.refresh).not.toHaveBeenCalled();
  expect(hooks.decide).not.toHaveBeenCalled();
});

it("refuses a fresh decision from a stale control once the deadline passed", async () => {
  await mount(proposal(1000));
  const row = current.rows[0]!;
  vi.setSystemTime(NOW + 1000);
  await current.decide(row, "approved");
  expect(hooks.decide).not.toHaveBeenCalled();
});

it("allows an explicit decision before expiry through the existing journal", async () => {
  await mount(proposal(1000));
  await current.decide(current.rows[0]!, "approved");
  expect(hooks.decide).toHaveBeenCalledTimes(1);
});
