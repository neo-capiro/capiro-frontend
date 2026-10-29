// The REAL async publication of `useGenerationDispatch`, exercised end to end:
// the hook's own publication branches (an admitted result, a definite refusal, an
// UNKNOWN admission whose answer was lost, and a rejection) run against the mocked
// canonical Capiro transport, and the caller's OWN current lifetime decides whether
// anything reaches the scope. No DOM renderer and no new harness are needed: `react`
// is replaced by a minimal dispatcher that keeps React's state semantics for this
// hook - a real state cell per `useState`, a setter, and a re-render - so the values
// asserted below are the hook's own returned state, not a copy of its internals.
//
// What this proves, which a test of an extracted helper cannot: a deferred success,
// rejection or UNKNOWN settling AFTER the caller's scope was replaced publishes
// nothing (no notice, no failure, no reload of the replaced scope), the current
// scope keeps its behaviour, and a stale completion cannot clear a LATER request's
// busy state.
import { expect, it, vi } from "vitest";
import type { GenerationPlan } from "./controller";

const mockRuntime = {
  cells: [] as Array<{ value: unknown }>,
  refs: [] as Array<{ current: unknown }>,
  cursor: 0,
  refCursor: 0,
  rerender: null as null | (() => void),
};

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const index = mockRuntime.cursor++;
    mockRuntime.cells[index] ??= { value: initial };
    const cell = mockRuntime.cells[index]!;
    return [
      cell.value,
      (next: unknown) => {
        cell.value =
          typeof next === "function"
            ? (next as (previous: unknown) => unknown)(cell.value)
            : next;
        mockRuntime.rerender?.();
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = mockRuntime.refCursor++;
    mockRuntime.refs[index] ??= { current: initial };
    return mockRuntime.refs[index]!;
  },
}));

const mockTransport = { request: vi.fn() };

vi.mock("../../../../shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => mockTransport,
}));

vi.mock("../../../../shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: undefined,
    loading: false,
    error: undefined,
    reload: () => {},
  }),
}));

const { useGenerationDispatch } = await import("./use-generation-panel");

/** A command plan for a non-native operation: a plain closed reply is applied. */
const statusPlan = {
  kind: "request",
  operation: "workspace.generation.run.status",
  input: { params: { runId: "run-1" } },
} as unknown as GenerationPlan;

/**
 * A command plan whose owner IS the native generation owner: its reply is read
 * through the operation's own closed receiving schema, so a drifted or absent shape
 * is an UNCONFIRMED admission rather than a success.
 */
const nativePlan = {
  kind: "request",
  operation: "workspace.generation.brief.synthesize",
  input: { params: { draftId: "draft-1" }, body: { paidGeneration: true } },
} as unknown as GenerationPlan;

type Deferred = {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

const deferred = (): Deferred => {
  let resolve: (value: unknown) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** Mount the REAL hook and expose its current rendered state. */
function mount() {
  mockRuntime.cells.length = 0;
  mockRuntime.refs.length = 0;
  const settled: number[] = [];
  let current: ReturnType<typeof useGenerationDispatch>;
  const render = () => {
    mockRuntime.cursor = 0;
    mockRuntime.refCursor = 0;
    current = useGenerationDispatch("owner", () => settled.push(1));
  };
  mockRuntime.rerender = render;
  render();
  return {
    get: () => current!,
    settled,
  };
}

it("keeps its behaviour while the caller's scope is still current", async () => {
  const admitted = deferred();
  mockTransport.request.mockReset();
  mockTransport.request.mockReturnValueOnce(admitted.promise);
  const mounted = mount();
  const pending = mounted.get().dispatch(statusPlan, "Read the run");
  expect(mounted.get().busy).toBe(true);

  admitted.resolve({ runId: "run-1", status: "active" });
  expect(await pending).toEqual({
    kind: "applied",
    result: { runId: "run-1", status: "active" },
  });
  expect(mounted.get().notice).toContain("Read the run");
  expect(mounted.get().failure).toBe("");
  expect(mounted.settled).toHaveLength(1);
  expect(mounted.get().busy).toBe(false);
});

it("publishes nothing into the scope that REPLACED the caller's while it was in flight", async () => {
  const scenarios: Array<{
    label: string;
    plan: GenerationPlan;
    settle: (request: Deferred) => void;
    outcome: (outcome: { kind: string }) => unknown;
  }> = [
    {
      label: "an admitted result",
      plan: statusPlan,
      settle: (request) => request.resolve({ runId: "run-1", status: "active" }),
      outcome: (outcome) => expect(outcome.kind).toBe("applied"),
    },
    {
      label: "an UNKNOWN admission whose answer was lost",
      plan: nativePlan,
      settle: (request) => request.resolve({ status: "unknown" }),
      outcome: (outcome) => expect(outcome.kind).toBe("unconfirmed"),
    },
    {
      label: "a rejection",
      plan: statusPlan,
      settle: (request) => request.reject(new Error("the transport failed")),
      outcome: (outcome) =>
        expect(["unconfirmed", "refused"]).toContain(outcome.kind),
    },
  ];

  for (const scenario of scenarios) {
    const request = deferred();
    mockTransport.request.mockReset();
    mockTransport.request.mockReturnValueOnce(request.promise);
    const mounted = mount();
    // The caller's own existing lifetime: current while the request is sent, and
    // disposed (a different account, document or revision) before it settles.
    let current = true;
    const pending = mounted.get().dispatch(scenario.plan, "Read the run", () => {
      if (!current) throw new Error("the attempt's scope was replaced");
    });
    expect(mounted.get().busy).toBe(true);
    current = false;
    scenario.settle(request);
    const outcome = await pending;
    // The caller still gets the REAL outcome of its own request...
    scenario.outcome(outcome);
    // ...and none of it was published into the scope that replaced it.
    expect(mounted.get().notice, scenario.label).toBe("");
    expect(mounted.get().failure, scenario.label).toBe("");
    expect(mounted.settled, scenario.label).toHaveLength(0);
    expect(mounted.get().busy, scenario.label).toBe(false);
  }
});

it("reports an UNKNOWN admission in the terms of the scope that is still current", async () => {
  const lost = deferred();
  mockTransport.request.mockReset();
  mockTransport.request.mockReturnValueOnce(lost.promise);
  const mounted = mount();
  const pending = mounted.get().dispatch(nativePlan, "Synthesize brief");
  // The operation's own closed receiving schema refuses this shape: the admission
  // is UNKNOWN, so the caller is told to review the re-read document.
  lost.resolve({ status: "unknown" });

  expect(await pending).toEqual({
    kind: "unconfirmed",
    reason:
      "That generation request is unconfirmed. The current document was re-read; review it before acting again.",
  });
  expect(mounted.get().notice).toBe("");
  expect(mounted.get().failure).toContain("unconfirmed");
  expect(mounted.settled).toHaveLength(1);
});

it("a stale completion cannot clear a LATER request's busy state", async () => {
  const first = deferred();
  const second = deferred();
  mockTransport.request.mockReset();
  mockTransport.request
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const mounted = mount();
  const earlier = mounted.get().dispatch(statusPlan, "First");
  const later = mounted.get().dispatch(statusPlan, "Second");
  expect(mounted.get().busy).toBe(true);

  first.resolve({ runId: "run-1", status: "active" });
  await earlier;
  // The later request is still in flight, so the control stays busy: the earlier
  // request's completion is not the lifetime that owns this flag any more.
  expect(mounted.get().busy).toBe(true);

  second.resolve({ runId: "run-1", status: "active" });
  await later;
  expect(mounted.get().busy).toBe(false);
});
