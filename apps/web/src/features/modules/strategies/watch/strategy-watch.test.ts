import { describe, expect, it } from "vitest";
import {
  watchState,
  strategiesWatchOperations,
} from "../../../../shared/capiro/operations/strategies-watch";
import { currentWatchSnapshot } from "./StrategyWatch";

const id = "51000000-0000-4000-8000-000000000001";
const head = "61000000-0000-4000-8000-000000000001";
const finding = {
  code: "cited-source-stale",
  severity: "warning",
  nodeIds: [id],
  category: "context",
  title: "Cited source needs review",
  message: "Cited source evidence changed or is no longer available.",
  impact: "These steps still cite an older or unavailable source.",
  suggestion: "Review the current source before revising these steps.",
  whyCompared: [
    "saved fact citation",
    "current document revision and fact state",
  ],
  sortRank: 4,
};
const state = {
  strategyId: id,
  headVersionId: head,
  mission: null,
  pendingCount: 0,
  proposals: [],
  sourceFindings: [finding],
};

describe("current Watch source receiving", () => {
  it("retains the actual advisory and rejects malformed source identity", () => {
    expect(watchState.parse(state).sourceFindings).toEqual([finding]);
    expect(
      watchState.safeParse({
        ...state,
        sourceFindings: [{ ...finding, nodeIds: [42] }],
      }).success,
    ).toBe(false);
    expect(
      watchState.safeParse({
        ...state,
        sourceFindings: [{ ...finding, code: "healthy" }],
      }).success,
    ).toBe(false);
  });
  it("keeps absent advisories distinct from an explicitly empty snapshot", () => {
    expect(
      watchState.parse({ ...state, sourceFindings: undefined }).sourceFindings,
    ).toBeUndefined();
    expect(
      watchState.parse({ ...state, sourceFindings: [] }).sourceFindings,
    ).toEqual([]);
  });
  it("binds strategy and proposal revisions without treating a failed check as complete", () => {
    const result = watchState.parse({
      ...state,
      lastRecheck: {
        state: "failed",
        elapsedMs: 10,
        unchanged: [],
        updated: [],
        dropped: [],
      },
    });
    expect(currentWatchSnapshot(result, id)).toBe(result);
    expect(currentWatchSnapshot(result, head)).toBeUndefined();
    const proposal = {
      id,
      watchKey: "synthetic",
      strategyVersionId: id,
      sourceLabel: "Synthetic source",
      sourceDate: null,
      badges: [],
      title: "Synthetic proposal",
      proposal: "Review",
      impact: "Review",
      why: "Review",
      risk: "low",
      recheckStatus: null,
    };
    expect(
      currentWatchSnapshot(
        watchState.parse({ ...state, proposals: [proposal] }),
        id,
      ),
    ).toBeUndefined();
    expect(
      currentWatchSnapshot(
        watchState.parse({
          ...state,
          proposals: [{ ...proposal, strategyVersionId: head }],
        }),
        id,
      ),
    ).toBeDefined();
    expect(result.lastRecheck?.state).toBe("failed");
  });
  it("uses the existing explicit forced check and read routes", () => {
    const operation = strategiesWatchOperations["strategies.watch.revalidate"];
    expect(operation.method).toBe("POST");
    expect(
      operation.request.parse({
        params: { strategyId: id },
        query: { force: "true" },
      }),
    ).toEqual({ params: { strategyId: id }, query: { force: "true" } });
    expect(
      operation.request.safeParse({ params: { strategyId: id } }).success,
    ).toBe(false);
    expect(strategiesWatchOperations["strategies.watch.state"].method).toBe(
      "GET",
    );
  });
});
