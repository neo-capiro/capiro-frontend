import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import {
  objectiveSavedReview,
  objectiveSavedReviewOperation,
  requireSavedStrategyReview,
} from "../src/shared/capiro/operations/objective-saved-review";
import { ObjectiveGeneratedStrategy } from "../src/features/modules/objective-destinations/ObjectiveGeneratedStrategy";
import { capiroOperations } from "../src/shared/capiro/registry";
const hooks = vi.hoisted(() => ({ query: vi.fn(), reload: vi.fn() }));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (...args: unknown[]) => hooks.query(...args),
}));
const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const selected = {
  query: { clientId: id(2), objectiveId: id(3), objectiveVersion: 2 },
  ids: { strategyId: id(5), strategyVersionId: id(6), generatedJobId: id(4) },
};
function fixture() {
  return {
    destination: {
      kind: "strategy_saved_review",
      resourceId: id(5),
      ...selected.query,
      objectiveRevisionId: id(8),
    },
    source: {
      ...selected.query,
      generationJobId: id(4),
      generationRequestId: id(7),
      objectiveRevisionId: id(8),
      strategyId: id(5),
      strategyVersionId: id(6),
      snapshotDigest: "1".repeat(64),
    },
    savedAt: "2026-10-31T10:02:00.000Z",
    context: {
      state: "complete",
      compiledAt: "2026-10-31T10:00:00.000Z",
      reobservedAt: "2026-10-31T10:01:00.000Z",
    },
    snapshot: {
      meta: {
        id: id(5),
        clientId: id(2),
        title: "Exact saved title",
        type: "coalition",
        goal: "Saved goal",
        targetDate: null,
        ownerUserId: "user_synthetic",
      },
      nodes: [
        {
          id: id(9),
          kind: "action",
          subject: "deliverable",
          title: "Saved action",
          note: "Saved note",
          ownerUserId: null,
          status: "draft",
          startsOn: "2026-11-01",
          endsOn: null,
          openEnded: false,
          dependsOnIds: [id(10)],
        },
        {
          id: id(10),
          kind: "risk",
          subject: "outcome",
          title: "Saved risk",
          note: null,
          ownerUserId: null,
          status: "draft",
          startsOn: "2026-11-02",
          endsOn: null,
          openEnded: true,
          dependsOnIds: [],
        },
      ],
    },
    currentNodes: [
      { sourceNodeId: id(9), availability: "available" },
      { sourceNodeId: id(10), availability: "archived" },
    ],
  };
}
beforeEach(() => {
  hooks.query.mockReset();
  hooks.reload.mockReset();
  hooks.query.mockReturnValue({
    data: fixture(),
    loading: false,
    reload: hooks.reload,
  });
});
it("registers a fixed read and rejects caller authority, private payloads and missing version selectors", () => {
  expect(capiroOperations["strategies.objectiveSavedReview"]).toBe(
    objectiveSavedReviewOperation,
  );
  expect(objectiveSavedReviewOperation.method).toBe("GET");
  expect(objectiveSavedReviewOperation.path).toBe(
    "/strategies/:id/objective-saved-review",
  );
  const input = {
    params: { id: id(5) },
    query: {
      ...selected.query,
      generationJobId: id(4),
      strategyVersionId: id(6),
    },
  };
  expect(objectiveSavedReviewOperation.request.safeParse(input).success).toBe(
    true,
  );
  for (const key of [
    "tenantId",
    "actorId",
    "snapshot",
    "consentId",
    "objectiveRevisionId",
  ])
    expect(
      objectiveSavedReviewOperation.request.safeParse({
        ...input,
        query: { ...input.query, [key]: id(11) },
      }).success,
    ).toBe(false);
  expect(
    objectiveSavedReviewOperation.request.safeParse({
      ...input,
      query: { ...selected.query, generationJobId: id(4) },
    }).success,
  ).toBe(false);
});
it.each(["clientId", "objectiveId", "objectiveVersion"] as const)(
  "refuses previous selection's %s",
  (key) => {
    const next = structuredClone(selected);
    if (key === "objectiveVersion") next.query[key]++;
    else next.query[key] = id(99);
    expect(() => requireSavedStrategyReview(fixture(), next)).toThrow();
  },
);
it.each(["strategyId", "strategyVersionId", "generatedJobId"] as const)(
  "refuses substituted %s",
  (key) => {
    const next = structuredClone(selected);
    next.ids[key] = id(99);
    expect(() => requireSavedStrategyReview(fixture(), next)).toThrow();
  },
);
it("rejects internally mismatched source, missing archive observations and leaked private snapshot fields", () => {
  const value = fixture();
  value.destination.objectiveRevisionId = id(99);
  expect(objectiveSavedReview.safeParse(value).success).toBe(false);
  value.destination.objectiveRevisionId = id(8);
  value.currentNodes.pop();
  expect(objectiveSavedReview.safeParse(value).success).toBe(false);
  const leaked = fixture();
  Object.assign(leaked.snapshot.meta, { meriContext: "PRIVATE" });
  expect(objectiveSavedReview.safeParse(leaked).success).toBe(false);
});
it("renders exact operative fields and explicit archive state using only the saved read", () => {
  const html = renderToStaticMarkup(
    createElement(ObjectiveGeneratedStrategy, selected),
  );
  for (const text of [
    "Exact saved title",
    "Saved action",
    "Saved risk",
    "2026-11-01",
    id(10),
    "archived",
    "explicit consent",
    "default group",
  ])
    expect(html).toContain(text);
  expect(html).not.toContain("Current authorized Strategy content");
  expect(hooks.query).toHaveBeenCalledExactlyOnceWith(
    "strategies.objectiveSavedReview",
    {
      params: { id: id(5) },
      query: {
        ...selected.query,
        generationJobId: id(4),
        strategyVersionId: id(6),
      },
    },
  );
  expect(hooks.reload).not.toHaveBeenCalled();
});
it.each(["loading", "error", "wrong-job"])(
  "hides saved content during %s",
  (state) => {
    const data = fixture();
    if (state === "wrong-job") data.source.generationJobId = id(99);
    hooks.query.mockReturnValue({
      data,
      loading: state === "loading",
      error: state === "error" ? new Error("Access revoked") : undefined,
      reload: hooks.reload,
    });
    const html = renderToStaticMarkup(
      createElement(ObjectiveGeneratedStrategy, selected),
    );
    expect(html).not.toContain("Exact saved title");
    expect(html).not.toContain("Saved action");
  },
);
it("an empty saved output stays visible without inventing work", () => {
  const data = fixture();
  data.snapshot.nodes = [];
  data.currentNodes = [];
  hooks.query.mockReturnValue({ data, loading: false, reload: hooks.reload });
  expect(
    renderToStaticMarkup(createElement(ObjectiveGeneratedStrategy, selected)),
  ).toContain("No saved steps.");
});
