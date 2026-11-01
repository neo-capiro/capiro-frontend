import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ObjectiveSavedCitations } from "../src/features/modules/objective-destinations/ObjectiveSavedCitations";

const hooks = vi.hoisted(() => ({ query: vi.fn(), reload: vi.fn() }));
vi.mock("react", async () => ({
  ...(await vi.importActual<typeof import("react")>("react")),
  useState: () => [true, vi.fn()],
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (...args: unknown[]) => hooks.query(...args),
}));
const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const source = {
  clientId: id(1),
  objectiveId: id(2),
  objectiveVersion: 2,
  generationJobId: id(3),
  generationRequestId: id(4),
  objectiveRevisionId: id(5),
  strategyId: id(6),
  strategyVersionId: id(7),
  snapshotDigest: "a".repeat(64),
};
const saved = {
  source,
  snapshot: { nodes: [{ id: id(8), title: "Immutable step" }] },
} as Parameters<typeof ObjectiveSavedCitations>[0]["saved"];
function data() {
  return {
    source,
    nodes: [
      {
        sourceNodeId: id(8),
        citations: [
          {
            index: 0,
            state: "available",
            kind: "context_fact",
            title: "Approved document",
            text: "Original extracted fact",
            textComplete: true,
            locator: "section:1",
            version: "b".repeat(64),
            asOfMs: Date.parse("2026-11-01T00:00:00Z"),
          },
        ],
      },
    ],
  };
}
beforeEach(() => {
  hooks.query.mockReset();
  hooks.reload.mockReset();
});
it("renders currently verified exact saved evidence without issuing a mutation", () => {
  hooks.query.mockReturnValue({
    data: data(),
    loading: false,
    reload: hooks.reload,
  });
  const html = renderToStaticMarkup(
    createElement(ObjectiveSavedCitations, { saved }),
  );
  expect(html).toContain("Original extracted fact");
  expect(html).toContain("2026-11-01 00:00:00 UTC");
  expect(html).toContain("section:1");
  expect(hooks.query).toHaveBeenCalledWith(
    "strategies.objectiveSavedCitations",
    expect.anything(),
    { enabled: true },
  );
  expect(hooks.reload).not.toHaveBeenCalled();
});
it("labels a bounded source excerpt explicitly", () => {
  const value = data();
  value.nodes[0].citations[0].textComplete = false;
  hooks.query.mockReturnValue({
    data: value,
    loading: false,
    reload: hooks.reload,
  });
  expect(
    renderToStaticMarkup(createElement(ObjectiveSavedCitations, { saved })),
  ).toContain("Excerpt of the originally cited source");
});
it.each(["loading", "error", "foreign-source", "foreign-node"])(
  "suppresses prior source content during %s",
  (state) => {
    const value = data();
    if (state === "foreign-source")
      value.source = { ...source, objectiveRevisionId: id(99) };
    if (state === "foreign-node") value.nodes[0].sourceNodeId = id(99);
    hooks.query.mockReturnValue({
      data: value,
      loading: state === "loading",
      error: state === "error" ? new Error("denied") : undefined,
      reload: hooks.reload,
    });
    const html = renderToStaticMarkup(
      createElement(ObjectiveSavedCitations, { saved }),
    );
    expect(html).not.toContain("Original extracted fact");
    expect(html).not.toContain("section:1");
    expect(html).toContain("Refresh saved sources");
  },
);
it("changed and unavailable sources disclose neither current replacement text nor stale locator", () => {
  hooks.query.mockReturnValue({
    data: {
      source,
      nodes: [
        {
          sourceNodeId: id(8),
          citations: [
            { index: 0, state: "changed", version: "b".repeat(64) },
            { index: 1, state: "unavailable" },
          ],
        },
      ],
    },
    loading: false,
    reload: hooks.reload,
  });
  const html = renderToStaticMarkup(
    createElement(ObjectiveSavedCitations, { saved }),
  );
  expect(html).toContain("This source changed after generation");
  expect(html).toContain("This saved source is unavailable");
  expect(html).not.toContain("Original extracted fact");
  expect(html).not.toContain("section:1");
});
