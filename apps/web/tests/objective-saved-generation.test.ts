import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  objectiveSavedGeneration,
  objectiveSavedGenerationOperation,
  requireSavedGenerationDiscovery,
  savedGenerationDiscoveryHref,
} from "../src/shared/capiro/operations/objective-saved-generation";
import { ObjectiveSavedGenerationCard } from "../src/features/portfolio/objectives/operational/ObjectiveSavedGenerationCard";
import type { Objective } from "../src/features/portfolio/objectives/contracts";
const queryState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
  calls: [] as unknown[],
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (...args: unknown[]) => {
    queryState.calls.push(args);
    return queryState.value;
  },
}));
// The implementation owner's separate consent component is tested in its own
// suite. This boundary only proves it mounts for a verified current selection.
vi.mock(
  "../src/features/portfolio/objectives/ObjectivePlannerAutomation",
  () => ({
    ObjectivePlannerAutomation: () =>
      createElement("div", { "data-automation": "verified-selection" }),
  }),
);
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const query = { clientId: id(1), objectiveId: id(2), objectiveVersion: 3 };
const value = {
  selection: {
    query,
    ids: { strategyId: id(4), strategyVersionId: id(5), generatedJobId: id(6) },
  },
  objectiveRevisionId: id(7),
  savedAt: "2026-11-01T00:00:00.000Z",
};
const objective = {
  id: query.objectiveId,
  clientId: query.clientId,
  version: query.objectiveVersion,
} as Objective;
beforeEach(() => {
  queryState.value = { loading: false, data: value, reload: vi.fn() };
  queryState.calls = [];
});

describe("exact saved generation discovery contract", () => {
  it("registers a fixed read with only the Objective binding", () => {
    expect(objectiveSavedGenerationOperation.method).toBe("GET");
    expect(objectiveSavedGenerationOperation.path).toBe(
      "/strategies/objective-saved-generation",
    );
    expect(objectiveSavedGenerationOperation.request.parse({ query })).toEqual({
      query,
    });
    for (const extra of [
      { actorId: id(9) },
      { url: "https://untrusted.invalid" },
      { generationJobId: id(9) },
    ])
      expect(
        objectiveSavedGenerationOperation.request.safeParse({
          query: { ...query, ...extra },
        }).success,
      ).toBe(false);
  });
  it("binds all exact identifiers in the existing receiving URL", () => {
    expect(requireSavedGenerationDiscovery(value, query)).toEqual(value);
    const url = new URL(
      savedGenerationDiscoveryHref(value),
      "https://synthetic.invalid",
    );
    expect(url.pathname).toBe("/modules/strategies");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ...query,
      objectiveVersion: "3",
      ...value.selection.ids,
    });
  });
  it.each(["clientId", "objectiveId", "objectiveVersion"] as const)(
    "rejects substituted %s",
    (key) => {
      const other = { ...query, [key]: key === "objectiveVersion" ? 4 : id(9) };
      expect(() => requireSavedGenerationDiscovery(value, other)).toThrow(
        /does not match/,
      );
    },
  );
  it("rejects private payload, mutable head and unbound output shapes", () => {
    for (const raw of [
      { ...value, snapshot: {} },
      {
        ...value,
        selection: { ...value.selection, ids: { strategyId: id(4) } },
      },
      { ...value, savedAt: "yesterday" },
    ])
      expect(objectiveSavedGeneration.safeParse(raw).success).toBe(false);
  });
});

describe("saved generation operational card", () => {
  const render = () =>
    renderToStaticMarkup(
      createElement(ObjectiveSavedGenerationCard, { objective }),
    );
  it("shows exact review and the separate action only after a matching successful read", () => {
    const html = render();
    expect(html).toContain("Review exact saved Strategy");
    expect(html).toContain("data-automation");
    expect(queryState.calls).toEqual([
      ["strategies.objectiveSavedGeneration", { query }],
    ]);
  });
  it.each(["loading", "error", "mismatch"])(
    "withholds stale links and actions on %s",
    (state) => {
      queryState.value =
        state === "loading"
          ? { ...queryState.value, loading: true }
          : state === "error"
            ? { ...queryState.value, error: new Error("revoked") }
            : {
                ...queryState.value,
                data: {
                  ...value,
                  selection: {
                    ...value.selection,
                    query: { ...query, objectiveVersion: 4 },
                  },
                },
              };
      const html = render();
      expect(html).not.toContain("Review exact saved Strategy");
      expect(html).not.toContain("data-automation");
    },
  );
});
