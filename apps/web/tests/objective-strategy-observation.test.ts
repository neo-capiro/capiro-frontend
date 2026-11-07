import "./command-recovery-platform";
import { afterEach, expect, it, vi } from "vitest";
import { setTimeout as pause } from "node:timers/promises";
import type { ReactElement } from "react";
import { db } from "./command-recovery-platform";
import {
  actor,
  client,
  objective,
  setup,
} from "./objective-strategy-intake-fixture";
import type { ObjectiveStrategyIntakeSession } from "../src/features/portfolio/objectives/objective-strategy-intake-session";
import { ObjectiveStrategyIntake } from "../src/features/portfolio/objectives/ObjectiveStrategyIntake";
import { objectiveSchema } from "../src/features/portfolio/objectives/contracts";

// Existing controlled-hook test pattern: the real component's polling effect and
// real session run over the encrypted journal and inert fetch fixture. This is
// developer lifecycle coverage, not browser/visual acceptance. The session is
// already hydrated before mounting; unrelated context hooks supply that fixture.
const mounted = vi.hoisted(() => ({
  session: null as ObjectiveStrategyIntakeSession | null,
  cache: null as ReturnType<typeof setup>["cache"] | null,
  counter: { current: { jobId: "", count: 0 } },
  dependencies: undefined as readonly unknown[] | undefined,
  cleanup: undefined as (() => void) | undefined,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useId: () => "synthetic-intake",
  useMemo: () => mounted.session,
  useState: (value: unknown) => [value, () => undefined],
  useRef: () => mounted.counter,
  useSyncExternalStore: () => mounted.session!.snapshot(),
  useLayoutEffect: () => undefined,
  useEffect(run: () => void | (() => void), dependencies: readonly unknown[]) {
    if (
      mounted.dependencies &&
      dependencies.every((value, index) =>
        Object.is(value, mounted.dependencies![index]),
      )
    )
      return;
    mounted.cleanup?.();
    mounted.dependencies = dependencies;
    mounted.cleanup = run() ?? undefined;
  },
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => mounted.cache,
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
vi.mock("../src/shared/portfolio/auth/identity", async (original) => ({
  ...(await original<typeof import("../src/shared/portfolio/auth/identity")>()),
  useIdentity: () => ({ isFetching: false }),
}));
vi.mock("../src/shared/portfolio/auth/client-writer", async (original) => ({
  ...(await original<
    typeof import("../src/shared/portfolio/auth/client-writer")
  >()),
  currentClientWriter: () => actor,
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({}),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({ state: "authorized-client", client }),
}));

afterEach(() => {
  mounted.cleanup?.();
  mounted.cleanup = undefined;
  mounted.dependencies = undefined;
  mounted.counter = { current: { jobId: "", count: 0 } };
  mounted.session = null;
  vi.useRealTimers();
});

async function accepted() {
  const s = setup(),
    session = s.session();
  await session.hydrate();
  expect(session.snapshot().error).toBeUndefined();
  await session.submit("appropriations");
  expect(session.snapshot().error).toBeUndefined();
  expect(session.snapshot().job?.status).toBe("queued");
  return { ...s, session };
}
function failRead(
  s: Pick<ReturnType<typeof setup>, "fetcher">,
  status: number,
  operation = "objectives.governedGeneration.read",
) {
  const original = s.fetcher.getMockImplementation()!;
  s.fetcher.mockImplementation(async (url, init) =>
    new URL(String(url), "https://example.invalid").pathname.endsWith(
      `/${operation}`,
    )
      ? Response.json({ message: "Synthetic read unavailable" }, { status })
      : original(url, init),
  );
  return () => s.fetcher.mockImplementation(original);
}
function reads(
  s: Pick<ReturnType<typeof setup>, "fetcher">,
  operation: string,
) {
  return s.fetcher.mock.calls.filter(([url]) =>
    new URL(String(url), "https://example.invalid").pathname.endsWith(
      `/${operation}`,
    ),
  );
}
function render() {
  const ready = ObjectiveStrategyIntake({
    objective: objectiveSchema.parse(objective),
    disabled: false,
  }) as ReactElement;
  expect(typeof ready.type).toBe("function");
  (ready.type as (props: unknown) => unknown)(ready.props);
}
function mount(s: Awaited<ReturnType<typeof accepted>>) {
  mounted.session = s.session;
  mounted.cache = s.cache;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  render();
}
async function poll() {
  await vi.advanceTimersByTimeAsync(5000);
  for (let i = 0; mounted.session!.snapshot().busy && i < 500; i++)
    await pause(1);
  expect(mounted.session!.snapshot().busy).toBe(false);
  render();
}

it("automatically observes the same accepted job through control503, running and completion without another effect", async () => {
  const s = await accepted(),
    retained = structuredClone(s.session.snapshot().retained!);
  const encrypted = structuredClone(db.records);
  const restore = failRead(s, 503);
  mount(s);
  await poll();
  expect(s.session.snapshot()).toMatchObject({
    error: undefined,
    canRetry: false,
    newSourceVerified: false,
  });
  expect(s.session.snapshot().retained).toEqual(retained);
  expect(db.records).toEqual(encrypted);
  expect(vi.getTimerCount()).toBe(1);
  restore();
  s.control.running = true;
  await poll();
  expect(s.session.snapshot().job?.status).toBe("running");
  s.control.running = false;
  s.control.complete = true;
  await poll();
  expect(s.session.snapshot().job?.status).toBe("completed");
  expect(s.session.snapshot().retained?.accepted).toEqual(retained.accepted);
  expect(s.session.snapshot().retained?.request).toEqual(retained.request);
  expect(s.session.snapshot().retained?.result).toBeTruthy();
  expect(vi.getTimerCount()).toBe(0);
  expect(s.writes).toHaveLength(1);
  expect(s.starts).toHaveBeenCalledTimes(1);
  for (const [url, init] of reads(s, "strategies.objectiveDraftJob")) {
    const input = JSON.parse(
      new URL(String(url), "https://example.invalid").searchParams.get(
        "input",
      )!,
    );
    expect(input.params.jobId).toBe(retained.accepted!.generationJobId);
    expect(init?.method).toBe("GET");
  }
});

it("consecutive control503s exhaust the existing120 polls without resetting the budget or replacing the journal", async () => {
  const s = await accepted(),
    retained = structuredClone(s.session.snapshot().retained!);
  const encrypted = structuredClone(db.records);
  const before = reads(s, "objectives.governedGeneration.read").length;
  const restore = failRead(s, 503);
  mount(s);
  for (let i = 0; i < 120; i++) await poll();
  expect(reads(s, "objectives.governedGeneration.read")).toHaveLength(
    before + 120,
  );
  expect(mounted.counter.current.count).toBe(120);
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(600000);
  expect(reads(s, "objectives.governedGeneration.read")).toHaveLength(
    before + 120,
  );
  expect(s.session.snapshot().retained).toEqual(retained);
  expect(db.records).toEqual(encrypted);
  expect(s.session.snapshot().canRetry).toBe(false);
  await s.session.refresh();
  expect(s.session.snapshot().error).toBeTruthy();
  restore();
  await s.session.refresh();
  render();
  expect(s.session.snapshot().error).toBeUndefined();
  expect(s.session.snapshot().job?.status).toBe("queued");
  expect(mounted.counter.current.count).toBe(120);
  expect(vi.getTimerCount()).toBe(0);
  expect(s.writes).toHaveLength(1);
  expect(s.starts).toHaveBeenCalledTimes(1);
});

it.each([401, 403, 404, 502])(
  "control read%s remains terminal for automatic polling",
  async (status) => {
    const s = await accepted(),
      retained = structuredClone(s.session.snapshot().retained);
    failRead(s, status);
    mount(s);
    await poll();
    expect(s.session.snapshot().error).toBeTruthy();
    expect(s.session.snapshot().canRetry).toBe(false);
    expect(s.session.snapshot().retained).toEqual(retained);
    expect(vi.getTimerCount()).toBe(0);
    expect(s.writes).toHaveLength(1);
    expect(s.starts).toHaveBeenCalledTimes(1);
  },
);

it.each(["control-shape", "job-source", "job503", "failed-control503"])(
  "%s cannot enter the control-read503 recovery path",
  async (defect) => {
    const s = await accepted(),
      retained = structuredClone(s.session.snapshot().retained);
    if (defect === "control-shape") failRead(s, 200);
    else if (defect === "job503")
      failRead(s, 503, "strategies.objectiveDraftJob");
    else if (defect === "failed-control503") {
      s.control.contextFailure = true;
      failRead(s, 503);
    } else {
      s.control.wrongRevision = true;
      failRead(s, 503);
    }
    mount(s);
    await poll();
    expect(s.session.snapshot().error).toBeTruthy();
    expect(s.session.snapshot().canRetry).toBe(false);
    expect(s.session.snapshot().retained).toEqual(retained);
    expect(vi.getTimerCount()).toBe(0);
    expect(s.writes).toHaveLength(1);
    expect(s.starts).toHaveBeenCalledTimes(1);
  },
);

it("an intake503 remains unconfirmed and never receives automatic command or start recovery", async () => {
  const s = setup(),
    session = s.session();
  await session.hydrate();
  s.control.status = 503;
  await session.submit("appropriations");
  expect(session.snapshot().error).toBeTruthy();
  expect(session.snapshot().retained?.accepted).toBeUndefined();
  expect(s.writes).toHaveLength(1);
  expect(s.starts).not.toHaveBeenCalled();
});
