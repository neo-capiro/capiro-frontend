import assert from "node:assert/strict";
import test from "node:test";
import {
  currentStrategyHref,
  currentStrategyStep,
  readStrategyNavigation,
  strategyHref,
} from "../src/shared/capiro/strategy-navigation.ts";

const clientId = "30000000-0000-4000-8000-000000000001";
const strategyId = "51000000-0000-4000-8000-000000000001";
const stepId = "61000000-0000-4000-8000-000000000001";
const node = {
  id: stepId,
  strategyId,
  archivedAt: null,
  title: "Current step",
};

test("Work Strategy and step links are internal exact-client selectors", () => {
  assert.equal(
    currentStrategyHref(clientId, strategyId, stepId),
    `/modules/strategies?clientId=${clientId}&strategy=${strategyId}&step=${stepId}`,
  );
  assert.equal(
    currentStrategyHref(clientId, strategyId),
    `/modules/strategies?clientId=${clientId}&strategy=${strategyId}`,
  );
});

test("New strategy opens the existing creation owner with a client hint", () => {
  const href = strategyHref({ clientId, create: true });
  assert.equal(
    href,
    `/modules/strategies?clientId=${clientId}&create=strategy`,
  );
  assert.deepEqual(
    readStrategyNavigation(new URL(href, "http://localhost").searchParams),
    {
      clientId,
      strategyId: undefined,
      stepId: undefined,
      linked: false,
      view: "library",
      creating: true,
      invalid: false,
    },
  );
});

test("view/client navigation replaces owned selectors and preserves unrelated query context", () => {
  const href = strategyHref(
    { view: "context" },
    `clientId=${clientId}&strategy=${strategyId}&step=${stepId}&create=strategy&view=runs&retained=one%20two&retained=three`,
  );
  const params = new URL(href, "http://localhost").searchParams;
  assert.deepEqual(params.getAll("retained"), ["one two", "three"]);
  for (const key of ["clientId", "strategy", "step", "create"])
    assert.equal(params.has(key), false);
  assert.equal(params.get("view"), "context");
  assert.equal(readStrategyNavigation(params).view, "context");
});

test("query selection is read afresh rather than retained from an earlier URL", () => {
  assert.equal(
    readStrategyNavigation(new URLSearchParams("view=review")).view,
    "review",
  );
  assert.equal(
    readStrategyNavigation(new URLSearchParams("view=context")).view,
    "context",
  );
  assert.equal(readStrategyNavigation(new URLSearchParams("")).view, "library");
});

for (const key of ["clientId", "strategy", "step", "view", "create"])
  test(`duplicate ${key} selectors fail closed`, () => {
    const params = new URLSearchParams(
      key === "create"
        ? `clientId=${clientId}&create=strategy`
        : `clientId=${clientId}&strategy=${strategyId}&step=${stepId}&view=library`,
    );
    params.append(key, params.get(key));
    assert.equal(readStrategyNavigation(params).invalid, true);
  });

test("orphan step and conflicting or unknown create commands fail closed", () => {
  for (const query of [
    `step=${stepId}`,
    `strategy=${strategyId}&create=strategy`,
    "create=other",
    "create=strategy&view=context",
  ])
    assert.equal(
      readStrategyNavigation(new URLSearchParams(query)).invalid,
      true,
    );
});

test("a step resolves only by unique current membership in the admitted Strategy", () => {
  assert.equal(currentStrategyStep([node], strategyId, stepId), node);
  assert.equal(currentStrategyStep([node], strategyId, "missing"), undefined);
  assert.equal(
    currentStrategyStep([node], "other-strategy", stepId),
    undefined,
  );
  assert.equal(
    currentStrategyStep(
      [{ ...node, archivedAt: "2026-10-15" }],
      strategyId,
      stepId,
    ),
    undefined,
  );
  assert.equal(
    currentStrategyStep([node, node], strategyId, stepId),
    undefined,
  );
  assert.equal(
    currentStrategyStep(
      [node, { ...node, strategyId: "other-strategy" }],
      strategyId,
      stepId,
    ),
    undefined,
  );
});
