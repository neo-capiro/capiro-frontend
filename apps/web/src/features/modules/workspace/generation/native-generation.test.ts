import { expect, it } from "vitest";
import type { DocumentAgentState } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { nativeAdmissionOutcome } from "./controller";
import {
  planNativeBriefSynthesis,
  planNativeContextAnalyze,
  planNativeContextRecommend,
  planNativeGenerationStart,
  planNativeOutlineGeneration,
} from "./native-generation";

// WS-22: the five supported generated phases. These are the only plans in this
// feature that carry a paid-generation intent, and every one of them pins the
// revision and mirrors the server's phase gate — so a button can never offer a
// request the Workspace owner would refuse, and no ordinary call can start a
// paid run.

const draftId = "00000000-0000-4000-8000-000000000001";

const state = (over: Partial<DocumentAgentState> = {}): DocumentAgentState => ({
  schemaVersion: 1,
  revision: 7,
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
  brief: { assumptions: [], provenance: {} },
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

const goal = { text: "Defend the program", createdAt: "2026-10-28T00:00:00.000Z" };
const objective = { assumptions: [], provenance: {}, objective: "Defend it" };
const pin = {
  blueprintId: "00000000-0000-4000-8000-0000000000cc",
  versionId: "00000000-0000-4000-8000-0000000000dd",
  version: 1,
  definitionHash: "a".repeat(64),
};
const approved = (over: Partial<DocumentAgentState> = {}) =>
  state({
    phase: "generate",
    brief: { ...objective, approvedAt: "2026-10-28T00:00:00.000Z" },
    contextPlan: {
      includedItemIds: [],
      excludedItems: [],
      conflicts: [],
      coverage: { plannedClaims: 0, supportedClaims: 0, missingClaims: [] },
      approvedAt: "2026-10-28T00:00:00.000Z",
    },
    outline: { version: 1, sections: [], approvedAt: "2026-10-28T00:00:00.000Z" },
    ...over,
  });

it("carries the truthful paid-generation intent, the pinned revision and the draft", () => {
  const plan = planNativeBriefSynthesis(state({ goal }), draftId);
  if (plan.kind !== "request")
    throw new Error(`expected a request, got ${plan.kind}`);
  expect(plan.operation).toBe("workspace.generation.brief.synthesize");
  expect(plan.input.params).toEqual({ draftId });
  // The intent is a closed body field the route's own DTO requires to be
  // exactly `true`; it carries no document text and no borrowed header.
  expect(plan.input.body).toEqual({ expectedRevision: 7, paidGeneration: true });
  expect(plan.input.idempotencyKey).toBeUndefined();
  expect(JSON.stringify(plan.input.body)).not.toContain(draftId);
});

it("pins the current revision on every supported phase", () => {
  const plans = [
    planNativeContextRecommend(state({ brief: objective, revision: 11 }), draftId),
    planNativeContextAnalyze(state({ brief: objective, revision: 12 }), draftId),
    planNativeOutlineGeneration(state({ blueprintPin: pin, revision: 13 }), draftId),
    planNativeGenerationStart(approved({ revision: 14 }), draftId),
  ];
  for (const plan of plans)
    if (plan.kind !== "request")
      throw new Error(`expected a request, got ${plan.kind}`);
  const revisions = plans.map(
    (plan) => (plan as { input: { body: { expectedRevision: number } } }).input.body.expectedRevision,
  );
  expect(revisions).toEqual([11, 12, 13, 14]);
  // Each declares the paid-generation intent as a body field, and never as a
  // borrowed header.
  for (const plan of plans) {
    const input = (plan as { input: { body: { paidGeneration?: boolean }; idempotencyKey?: string } }).input;
    expect(input.body.paidGeneration).toBe(true);
    expect(input.idempotencyKey).toBeUndefined();
  }
});

it("refuses a phase the server would refuse instead of offering a dead control", () => {
  const noGoal = planNativeBriefSynthesis(state(), draftId);
  expect(noGoal.kind).toBe("refusal");
  expect(noGoal.kind === "refusal" ? noGoal.reason : "").toContain(
    "Set the document goal",
  );
  const noObjective = planNativeContextRecommend(state(), draftId);
  expect(noObjective.kind).toBe("refusal");
  const noBlueprint = planNativeOutlineGeneration(state({ goal }), draftId);
  expect(noBlueprint.kind).toBe("refusal");
  expect(noBlueprint.kind === "refusal" ? noBlueprint.reason : "").toContain(
    "Pin a blueprint",
  );
  const unapproved = planNativeGenerationStart(state({ goal }), draftId);
  expect(unapproved.kind).toBe("refusal");
  expect(unapproved.kind === "refusal" ? unapproved.reason : "").toContain(
    "Approve the brief",
  );
  const noOutlineApproval = planNativeGenerationStart(
    approved({ outline: { version: 1, sections: [] } }),
    draftId,
  );
  expect(noOutlineApproval.kind).toBe("refusal");
  expect(noOutlineApproval.kind === "refusal" ? noOutlineApproval.reason : "").toContain(
    "Approve the outline",
  );
});

it("carries the selected mode only when one is given", () => {
  const plan = planNativeGenerationStart(approved(), draftId, "max");
  if (plan.kind !== "request")
    throw new Error(`expected a request, got ${plan.kind}`);
  expect(plan.input.body).toEqual({
    expectedRevision: 7,
    mode: "max",
    paidGeneration: true,
  });
});

it("treats an unconfirmed native admission as reconcile, never as success", () => {
  expect(nativeAdmissionOutcome("result")).toBe("applied");
  expect(nativeAdmissionOutcome("proposed")).toBe("applied");
  expect(nativeAdmissionOutcome("approval-required")).toBe("applied");
  expect(nativeAdmissionOutcome("unknown")).toBe("unknown");
});
