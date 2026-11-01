import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ObjectiveLegacyPlanBoundary } from "../src/features/portfolio/objectives/ObjectiveLegacyPlanBoundary";
import type { PlanState } from "../src/features/portfolio/objectives/objective-plan-session";
const mock = vi.hoisted(() => ({
  state: {} as PlanState,
  refresh: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("../src/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({ data: { jobId: "saved" }, loading: false }),
}));
vi.mock("../src/shared/capiro/operations/objective-generation", () => ({
  requireGeneratedStrategy: (raw: unknown) => raw,
}));
vi.mock("../src/features/portfolio/objectives/objective-plan-recovery", () => ({
  createPlanRecovery: () => ({}),
}));
vi.mock("../src/features/portfolio/objectives/objective-plan-session", () => ({
  ObjectivePlanSession: class {
    subscribe = () => () => {};
    snapshot = () => mock.state;
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
