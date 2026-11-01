import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ObjectiveLegacyPlanBoundary } from "../src/features/portfolio/objectives/ObjectiveLegacyPlanBoundary";
import type { PlanState } from "../src/features/portfolio/objectives/objective-plan-session";
const mock = vi.hoisted(() => ({
  state: {} as PlanState,
  refresh: vi.fn(),
  execute: vi.fn(),
  reload: vi.fn(),
  readError: false,
  loading: false,
  mismatch: false,
  api: {},
  cache: {},
  frame: null as null | Array<{ value: unknown; deps?: readonly unknown[] }>,
  cursor: 0,
  instances: [] as Array<{ state: PlanState }>,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useRef: <T>(value: T) => {
      if (!mock.frame) return actual.useRef(value);
      const index = mock.cursor++;
      return (mock.frame[index] ??= { value: { current: value } }).value;
    },
    useMemo: <T>(factory: () => T, deps: readonly unknown[]) => {
      if (!mock.frame) return actual.useMemo(factory, deps);
      const index = mock.cursor++,
        previous = mock.frame[index];
      if (
        !previous ||
        !deps.every((value, i) => Object.is(value, previous.deps?.[i]))
      ) {
        const next = { value: factory(), deps };
        mock.frame[index] = next;
        return next.value;
      }
      return previous.value;
    },
    useSyncExternalStore: (
      ...args: Parameters<typeof actual.useSyncExternalStore>
    ) => (mock.frame ? args[1]() : actual.useSyncExternalStore(...args)),
    useLayoutEffect: (...args: Parameters<typeof actual.useLayoutEffect>) => {
      if (!mock.frame) actual.useLayoutEffect(...args);
    },
  };
});
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => mock.cache }));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => mock.api,
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: { jobId: "saved" },
    loading: mock.loading,
    error: mock.readError,
    reload: mock.reload,
  }),
}));
vi.mock("../src/shared/capiro/operations/objective-generation", () => ({
  requireGeneratedStrategy: (raw: unknown) => {
    if (mock.mismatch) throw new Error("mismatch");
    return structuredClone(raw);
  },
}));
vi.mock("../src/features/portfolio/objectives/objective-plan-recovery", () => ({
  createPlanRecovery: () => ({}),
}));
vi.mock("../src/features/portfolio/objectives/objective-plan-session", () => ({
  ObjectivePlanSession: class {
    state = mock.state;
    constructor() {
      mock.instances.push(this);
    }
    subscribe = () => () => {};
    snapshot = () => this.state;
    suspend = () => {};
    refresh = mock.refresh;
    execute = mock.execute;
  },
}));
const id = "00000000-0000-4000-8000-000000000001";
const props = {
  selection: {
    query: { clientId: id, objectiveId: id, objectiveVersion: 2 },
    ids: { generatedJobId: id, strategyId: id, strategyVersionId: id },
  },
  actor: { tenantId: "synthetic", userId: "synthetic" },
  children: createElement("p", {}, "New canonical consent"),
};
beforeEach(() => {
  mock.state = { ready: true, busy: false, verified: false, uncertain: false };
  mock.refresh.mockReset();
  mock.execute.mockReset();
  mock.readError = false;
  mock.loading = false;
  mock.mismatch = false;
  mock.frame = null;
  mock.instances = [];
});
it("allows new consent only after original recovery establishes no retained attempt", () => {
  expect(
    renderToStaticMarkup(createElement(ObjectiveLegacyPlanBoundary, props)),
  ).toContain("New canonical consent");
  expect(mock.execute).not.toHaveBeenCalled();
});
it("keeps an original unknown request visible and withholds canonical consent", () => {
  mock.state.request = {
    requestId: id,
    generationJobId: id,
    expected: {
      strategyId: id,
      strategyVersionId: id,
      objectiveRevisionId: id,
    },
  };
  mock.state.uncertain = true;
  const html = renderToStaticMarkup(
    createElement(ObjectiveLegacyPlanBoundary, props),
  );
  expect(html).toContain("Original Planner attempt recovery");
  expect(html).toContain(id);
  expect(html).not.toContain("New canonical consent");
  expect(mock.execute).not.toHaveBeenCalled();
});
it("unavailable recovery never becomes absence or permission for another plan", () => {
  mock.state.ready = false;
  mock.state.error = "Saved recovery unavailable";
  const html = renderToStaticMarkup(
    createElement(ObjectiveLegacyPlanBoundary, props),
  );
  expect(html).toContain("Saved recovery unavailable");
  expect(html).not.toContain("New canonical consent");
});
it.each(["readError", "mismatch"] as const)(
  "offers an explicit read retry after %s",
  (failure) => {
    mock[failure] = true;
    const html = renderToStaticMarkup(
      createElement(ObjectiveLegacyPlanBoundary, props),
    );
    expect(html).toContain("Retry saved Strategy read");
    expect(html).not.toContain("Verifying the saved Strategy");
    expect(html).not.toContain("New canonical consent");
  },
);
it("retains the original session through same-source refresh and storage loss", () => {
  // Simulate persistent React hook cells; actual browser mounting remains a Release check.
  const outer: NonNullable<typeof mock.frame> = [],
    inner: NonNullable<typeof mock.frame> = [];
  const render = () => {
    mock.frame = outer;
    mock.cursor = 0;
    const element = ObjectiveLegacyPlanBoundary(props);
    mock.frame = inner;
    mock.cursor = 0;
    return (
      element.type as (props: unknown) => ReturnType<typeof createElement>
    )(element.props);
  };
  expect(render()).toBe(props.children);
  const original = mock.instances[0];
  if (!original) throw new Error("Expected the original Planner session");
  original.state = {
    ...mock.state,
    uncertain: true,
    request: {
      requestId: id,
      generationJobId: id,
      expected: {
        strategyId: id,
        strategyVersionId: id,
        objectiveRevisionId: id,
      },
    },
  };
  // A replacement instance would start with the empty recovery-storage snapshot.
  expect(render().props).toMatchObject({
    "aria-label": "Original Planner attempt recovery",
  });
  mock.loading = true;
  expect(render().props).toMatchObject({ role: "status" });
  mock.loading = false;
  mock.readError = true;
  render();
  mock.readError = false;
  expect(render().props).toMatchObject({
    "aria-label": "Original Planner attempt recovery",
  });
  expect(mock.instances).toHaveLength(1);
  mock.frame = null;
});
