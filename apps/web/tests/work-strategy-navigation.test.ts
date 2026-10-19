import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { WorkPage } from "../src/features/portfolio/work/WorkPage";

const { strategy, clientId, stepId } = vi.hoisted(() => ({
  clientId: "30000000-0000-4000-8000-000000000001",
  stepId: "61000000-0000-4000-8000-000000000001",
  strategy: {
    id: "51000000-0000-4000-8000-000000000001",
    clientId: "30000000-0000-4000-8000-000000000001",
    title: "Synthetic current strategy",
    type: "appropriations",
    ownerUserId: null,
    draftedByMeri: false,
    goal: "Synthetic current goal",
    targetDate: null,
    nodes: [
      {
        id: "61000000-0000-4000-8000-000000000001",
        title: "Synthetic current step",
        kind: "action",
        status: "active",
        startsOn: "2040-10-20",
        endsOn: null,
        openEnded: false,
        ownerUserId: null,
        note: null,
      },
    ],
    artifacts: [],
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({ data: [], loading: false, reload: vi.fn() }),
}));
vi.mock("../src/features/portfolio/work/queries", () => ({
  useStrategies: () => ({ isSuccess: true, data: [strategy] }),
  useStrategyDetails: () => [{ isSuccess: true, data: strategy }],
}));
vi.mock("../src/features/portfolio/work/WorkspaceDocuments", () => ({
  WorkspaceDocuments: () => null,
}));

it("keeps current Strategy, node and creation links available without a legacy host", () => {
  const html = renderToStaticMarkup(
    createElement(WorkPage, { clientId, destinations: {} }),
  );
  expect(html).toContain(`href="/modules/strategies?clientId=${clientId}"`);
  expect(html).toContain(
    `href="/modules/strategies?clientId=${clientId}&amp;create=strategy"`,
  );
  expect(html).toContain(
    `href="/modules/strategies?clientId=${clientId}&amp;strategy=${strategy.id}"`,
  );
  expect(html).toContain(
    `href="/modules/strategies?clientId=${clientId}&amp;strategy=${strategy.id}&amp;step=${stepId}"`,
  );
  expect(html).not.toContain("Configure the existing application destination");
});
