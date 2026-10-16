import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { strategyRun } from "../src/shared/capiro/operations/strategies-agents";
import { strategyDetail } from "../src/shared/capiro/operations/strategies-schemas";
import {
  currentRunExecution,
  runPlanStepHref,
  RunPlanStepLink,
} from "../src/features/modules/strategies/runs/RunPlanStepLink";

const harness = vi.hoisted(() => ({
  scope: { state: "no-selection" } as {
    state: string;
    requestedId?: string;
    client?: { id: string };
  },
  query: {
    loading: false,
    data: undefined as unknown,
    error: undefined as Error | undefined,
    reload: vi.fn(),
  },
  reads: vi.fn(),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => harness.scope,
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (...args: unknown[]) => {
    harness.reads(...args);
    return harness.query;
  },
}));

const clientId = "30000000-0000-4000-8000-000000000001";
const otherClientId = "30000000-0000-4000-8000-000000000002";
const strategyId = "51000000-0000-4000-8000-000000000001";
const otherStrategyId = "51000000-0000-4000-8000-000000000002";
const stepId = "61000000-0000-4000-8000-000000000001";
const missionId = "71000000-0000-4000-8000-000000000001";
const run = strategyRun.parse({
  id: "81000000-0000-4000-8000-000000000001",
  missionId,
  strategyId,
  state: "failed_recoverable",
  trigger: "manual",
  findings: {
    execution: {
      kind: "workspace",
      nodeId: stepId,
      strategyId,
      missionId,
      pinnedVersionId: null,
    },
  },
  waitingReason: null,
  error: null,
  createdAt: "2026-10-15T12:00:00Z",
  startedAt: "2026-10-15T12:00:01Z",
  finishedAt: null,
  heartbeatAt: null,
  attempt: 1,
  retryOfRunId: null,
  supersededByRunId: null,
});
const detail = strategyDetail.parse({
  id: strategyId,
  clientId,
  title: "Synthetic current Strategy",
  type: "appropriations",
  ownerUserId: null,
  goal: null,
  meriContext: null,
  targetDate: null,
  lastEditedAt: "2026-10-15T12:00:00Z",
  nodes: [
    {
      id: stepId,
      strategyId,
      kind: "action",
      subject: "deliverable",
      title: "Synthetic current step",
      note: null,
      ownerUserId: null,
      status: "active",
      startsOn: "2026-10-20",
      endsOn: null,
      openEnded: false,
      dependsOnIds: [],
      updatedAt: "2026-10-15T12:00:00Z",
      archivedAt: null,
    },
  ],
});
const href = `/modules/strategies?clientId=${clientId}&strategy=${strategyId}&step=${stepId}`;

beforeEach(() => {
  harness.scope = { state: "no-selection" };
  harness.query.data = detail;
  harness.query.loading = false;
  harness.query.error = undefined;
  harness.reads.mockClear();
});

it("uses the fresh detail client and current node; mission and Strategy IDs remain distinct", () => {
  expect(missionId).not.toBe(strategyId);
  expect(runPlanStepHref(run, detail)).toBe(href);
  expect(runPlanStepHref(run, detail, clientId)).toBe(href);
});
it("refuses a different currently selected client", () => {
  expect(runPlanStepHref(run, detail, otherClientId)).toBeUndefined();
});
it("refuses a different returned Strategy ID", () => {
  expect(
    runPlanStepHref(run, { ...detail, id: otherStrategyId }),
  ).toBeUndefined();
});
it("refuses a non-null run Strategy that contradicts its execution binding", () => {
  const changed = { ...run, strategyId: otherStrategyId };
  expect(currentRunExecution(changed)).toBeUndefined();
  expect(runPlanStepHref(changed, detail)).toBeUndefined();
});
it("refuses a different execution mission", () => {
  expect(
    runPlanStepHref({ ...run, missionId: otherStrategyId }, detail),
  ).toBeUndefined();
});
it("does not invent a missing top-level Strategy witness when it is nullable", () => {
  expect(runPlanStepHref({ ...run, strategyId: null }, detail)).toBe(href);
});
it("requires the actual execution source rather than guessing from run Strategy alone", () => {
  expect(runPlanStepHref({ ...run, findings: null }, detail)).toBeUndefined();
});
it("refuses a malformed client ID instead of producing an invalid destination", () => {
  expect(
    runPlanStepHref(run, { ...detail, clientId: "invalid" }),
  ).toBeUndefined();
});
for (const [label, nodes] of [
  ["missing", []],
  ["foreign parent", [{ ...detail.nodes[0]!, strategyId: otherStrategyId }]],
  ["duplicate", [detail.nodes[0]!, detail.nodes[0]!]],
  ["archived", [{ ...detail.nodes[0]!, archivedAt: "2026-10-16T00:00:00Z" }]],
] as const)
  it(`refuses ${label} current node membership`, () => {
    expect(
      runPlanStepHref(run, { ...detail, nodes: [...nodes] }),
    ).toBeUndefined();
  });

it("renders only the canonical admitted current destination", () => {
  const html = renderToStaticMarkup(createElement(RunPlanStepLink, { run }));
  expect(html).toContain(`href="${href.replaceAll("&", "&amp;")}"`);
  expect(html).not.toContain("strategyId=");
  expect(html).not.toContain("nodeId=");
  expect(harness.reads).toHaveBeenCalledWith(
    "strategies.detail",
    { params: { id: strategyId } },
    { enabled: true },
  );
});
it("does not render a link while current detail is loading", () => {
  harness.query.loading = true;
  const html = renderToStaticMarkup(createElement(RunPlanStepLink, { run }));
  expect(html).not.toContain("href=");
});
it("preserves the read failure and offers retry without a destination", () => {
  harness.query.error = new Error("Synthetic read refusal");
  const html = renderToStaticMarkup(createElement(RunPlanStepLink, { run }));
  expect(html).toContain("Synthetic read refusal");
  expect(html).toContain("Try again");
  expect(html).not.toContain("href=");
});
it("disables detail reading and navigation for an unavailable selected client", () => {
  harness.scope = { state: "unavailable", requestedId: clientId };
  const html = renderToStaticMarkup(createElement(RunPlanStepLink, { run }));
  expect(harness.reads).toHaveBeenCalledWith(
    "strategies.detail",
    { params: { id: strategyId } },
    { enabled: false },
  );
  expect(html).not.toContain("href=");
  expect(html).toContain("selected client is unavailable");
});
it("keeps an unavailable current node distinct from an ordinary whole-Strategy link", () => {
  harness.query.data = { ...detail, nodes: [] };
  const html = renderToStaticMarkup(createElement(RunPlanStepLink, { run }));
  expect(html).toContain("current plan step is unavailable");
  expect(html).not.toContain("href=");
});
it("does not read or link an inconsistent mission even when old detail remains supplied", () => {
  const changed = { ...run, missionId: otherStrategyId };
  const html = renderToStaticMarkup(
    createElement(RunPlanStepLink, { run: changed }),
  );
  expect(harness.reads).toHaveBeenCalledWith(
    "strategies.detail",
    { params: { id: "" } },
    { enabled: false },
  );
  expect(html).not.toContain("href=");
});
