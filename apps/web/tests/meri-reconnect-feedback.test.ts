import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { useRunObservation } from "../src/features/meri/conversation/useRunObservation";
import type { MeriConversationPort } from "../src/shared/meri-conversations/host-controller";

// Closed hook callback controls, following the existing SSR/effect probes. Browser scheduling is a separate gate.
const probe = vi.hoisted(() => ({
  value: undefined as unknown,
  ref: { current: null as AbortController | null },
  effect: undefined as undefined | (() => void | (() => void)),
  cleanup: undefined as undefined | (() => void),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    if (probe.value === undefined) probe.value = initial;
    return [
      probe.value,
      (value: unknown) => {
        probe.value = value;
      },
    ];
  },
  useRef: () => probe.ref,
  useEffect: (effect: typeof probe.effect) => {
    probe.effect = effect;
  },
}));
vi.mock("@capiro/ui/button", () => ({
  Button: ({ children, onClick }: { children: string; onClick: () => void }) =>
    createElement("button", { onClick }, children),
}));

beforeEach(() => {
  vi.useFakeTimers();
  probe.value = undefined;
  probe.ref.current = null;
  probe.effect = probe.cleanup = undefined;
});
afterEach(() => {
  probe.ref.current?.abort();
  probe.cleanup?.();
  vi.useRealTimers();
});
function feedback(observing: string, active = true) {
  const run = {
    snapshot: {},
    intent: {},
    busy: false,
    transcript: "loaded",
    observing,
    reconnect: vi.fn(),
  } as unknown as ComponentProps<typeof RunStatus>["run"];
  return renderToStaticMarkup(createElement(RunStatus, { run, active }));
}
function commitEffect() {
  probe.cleanup?.();
  probe.cleanup = probe.effect?.() || undefined;
}

it("keeps identical quiet feedback during a short interruption and cancels its warning on recovery", async () => {
  const live = feedback("live");
  commitEffect();
  expect(feedback("reconnecting")).toBe(live);
  commitEffect();
  await vi.advanceTimersByTimeAsync(2_999);
  expect(feedback("reconnecting")).toBe(live);
  expect(feedback("live")).toBe(live);
  commitEffect();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(feedback("live")).toBe(live);
  expect(vi.getTimerCount()).toBe(0);
});

it("warns on sustained recovery and gives a fresh grace period after a successful recovery", async () => {
  feedback("reconnecting");
  commitEffect();
  await vi.advanceTimersByTimeAsync(3_000);
  expect(feedback("reconnecting")).toContain(
    "Updates are delayed. Reconnecting from the last received update",
  );
  expect(feedback("live")).not.toContain("Updates are delayed");
  commitEffect();
  expect(feedback("reconnecting")).not.toContain("Updates are delayed");
  commitEffect();
  await vi.advanceTimersByTimeAsync(2_999);
  expect(feedback("reconnecting")).not.toContain("Updates are delayed");
});

it("shows stalled uncertainty immediately and suppresses recovery feedback after the run ends", async () => {
  feedback("reconnecting");
  commitEffect();
  expect(feedback("stalled")).toContain("The current run status is unknown");
  commitEffect();
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(5_000);
  expect(feedback("reconnecting", false)).not.toMatch(
    /Reconnecting|Waiting for Meri|Updates are delayed/,
  );
});

function observation() {
  const listeners = new Set<() => void>();
  const snapshot = { observation: { after: 7, runState: "running" } };
  let finish!: () => void;
  const resumed = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const resume = vi
    .fn()
    .mockRejectedValueOnce(new Error("synthetic outage"))
    .mockReturnValue(resumed);
  const send = vi.fn();
  const port = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    openChat: () => ({ chat: { resumeStream: resume, sendMessage: send } }),
  } as unknown as MeriConversationPort;
  const alive = { current: true };
  const hook = useRunObservation(port, alive);
  return {
    listeners,
    snapshot,
    finish,
    resume,
    send,
    alive,
    hook,
    changed: () => {
      for (const listener of listeners) listener();
    },
  };
}

it("clears recovery on newly admitted progress before the stream closes, keeping one loop and no new submission", async () => {
  const test = observation();
  test.hook.observe();
  await vi.advanceTimersByTimeAsync(1_000);
  expect(probe.value).toBe("reconnecting");
  test.hook.observe();
  expect(test.resume).toHaveBeenCalledTimes(2);
  test.snapshot.observation.after = 8;
  test.changed();
  expect(probe.value).toBe("live");
  expect(test.snapshot.observation.after).toBe(8);
  expect(test.send).not.toHaveBeenCalled();
  test.hook.stop();
  expect(test.listeners.size).toBe(0);
  test.finish();
  await vi.advanceTimersByTimeAsync(0);
  expect(test.resume).toHaveBeenCalledTimes(2);
});

it("does not clear recovery on unrelated notifications and retires listeners immediately on stop", async () => {
  const test = observation();
  test.hook.observe();
  await vi.advanceTimersByTimeAsync(1_000);
  test.changed();
  expect(probe.value).toBe("reconnecting");
  const retired = [...test.listeners];
  expect(retired).toHaveLength(1);
  test.hook.stop();
  expect(test.listeners.size).toBe(0);
  test.snapshot.observation.after++;
  for (const callback of retired) callback();
  expect(probe.value).toBe("reconnecting");
  test.finish();
  await vi.advanceTimersByTimeAsync(0);
});

it("ignores progress after identity retirement and removes the listener on settlement", async () => {
  const test = observation();
  test.hook.observe();
  await vi.advanceTimersByTimeAsync(1_000);
  test.alive.current = false;
  test.snapshot.observation.after++;
  test.changed();
  expect(probe.value).toBe("reconnecting");
  test.snapshot.observation.runState = "completed";
  test.finish();
  await vi.advanceTimersByTimeAsync(0);
  expect(test.listeners.size).toBe(0);
  expect(probe.value).toBe("reconnecting");
});
