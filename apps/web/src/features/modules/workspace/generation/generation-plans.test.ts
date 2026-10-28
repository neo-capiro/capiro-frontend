import { expect, it } from "vitest";
import type { DocumentAgentState } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { planInitialize, planModeChange } from "./plans";

const draftId = "00000000-0000-4000-8000-000000000001";

const state = (over: Partial<DocumentAgentState> = {}): DocumentAgentState => ({
  schemaVersion: 1,
  revision: 4,
  phase: "brief",
  status: "active",
  documentType: {
    id: "cap-brief",
    label: "Capability brief",
    product: "legislative",
  },
  blueprintPin: null,
  theme: null,
  goal: null,
  brief: { assumptions: [], provenance: {}, objective: "Defend the program" },
  contextPlan: {
    includedItemIds: [],
    excludedItems: [],
    conflicts: [],
    coverage: { plannedClaims: 0, supportedClaims: 0, missingClaims: [] },
  },
  outline: { version: 1, sections: [] },
  generation: { mode: "standard" },
  ...over,
});

it("pins the revision when the generation mode changes", () => {
  const plan = planModeChange(state({ revision: 3 }), draftId, "max");
  if (plan.kind !== "request")
    throw new Error(`expected a request, got ${plan.kind}`);
  expect(plan.operation).toBe("workspace.generation.patch");
  expect(plan.input.body).toEqual({
    expectedRevision: 3,
    generation: { mode: "max" },
  });
});

it("refuses an initialize without a document type or a goal", () => {
  const documentType = {
    id: "cap-brief",
    label: "Capability brief",
    product: "legislative",
  };
  expect(
    planInitialize(draftId, { ...documentType, id: "" }, "Defend it").kind,
  ).toBe("refusal");
  expect(planInitialize(draftId, documentType, "ab").kind).toBe("refusal");
  const plan = planInitialize(draftId, documentType, "Defend the program");
  if (plan.kind !== "request")
    throw new Error(`expected a request, got ${plan.kind}`);
  expect(plan.operation).toBe("workspace.generation.initialize");
  expect(plan.input.params).toEqual({ draftId });
  expect(plan.input.body).toEqual({ documentType, goal: "Defend the program" });
});
