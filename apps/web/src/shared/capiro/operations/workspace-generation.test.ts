import { expect, it } from "vitest";
import { workspaceGenerationOperations } from "./workspace-generation";
import {
  documentAgentState,
  generationRunStatus,
  intakeBody,
} from "./workspace-generation-schemas";

const draftId = "00000000-0000-4000-8000-000000000001";
const proposalId = "00000000-0000-4000-8000-000000000002";
const issueId = "size.over_budget";
const servicePath =
  /^\/(?:[A-Za-z0-9_-]+|:[A-Za-z][A-Za-z0-9_]*)(?:\/(?:[A-Za-z0-9_-]+|:[A-Za-z][A-Za-z0-9_]*))*$/;

const operations = workspaceGenerationOperations;

// The regression this file exists to prevent: re-adding a model-backed route to
// the consumer without an approved greenfield owner. Each of these is still
// served by the legacy MeriV3/provider handler and has no greenfield owner; a
// consumer that calls one would activate that path.
const withheldRoutes: readonly [string, string][] = [
  ["POST", "/document-agent/recommend"],
  ["POST", "/drafts/:draftId/agent/messages"],
  ["POST", "/drafts/:draftId/agent/generation/retry"],
  ["POST", "/document-agent/runs/:runId/retry-failed"],
];

// The five SUPPORTED generated phases are declared now: the approved greenfield
// Meri native conversation owner serves them, and each carries the explicit
// paid-generation intent as the BODY field `paidGeneration: true` — none of them
// declares a request header.
const nativeGenerationRoutes: readonly [string, string][] = [
  ["POST", "/drafts/:draftId/agent/brief/synthesize"],
  ["POST", "/drafts/:draftId/agent/context/recommend"],
  ["POST", "/drafts/:draftId/agent/context/analyze"],
  ["POST", "/drafts/:draftId/agent/outline/generate"],
  ["POST", "/drafts/:draftId/agent/generate"],
];

const stateFixture = {
  schemaVersion: 1 as const,
  revision: 4,
  phase: "brief" as const,
  status: "active" as const,
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
  generation: { mode: "standard" as const },
};

const intakeFixture = {
  goal: "Defend the 2027 program",
  blueprintVersionId: "bp-1",
  factualAttachmentIds: [],
  sampleAttachmentIds: [],
  priorWorkspaceDraftIds: [],
};

it("declares only fixed relative workspaces service paths", () => {
  for (const [key, definition] of Object.entries(operations)) {
    expect(definition.service, key).toBe("workspace");
    expect(definition.path, key).toMatch(servicePath);
    expect(definition.source, key).toContain("apps/workspace/src");
  }
});

it("keeps every registered read body-free", () => {
  const reads = Object.entries(operations).filter(
    ([, definition]) => definition.method === "GET",
  );
  expect(reads.length).toBeGreaterThan(0);
  for (const [key, definition] of reads)
    expect(definition.request.safeParse({ body: {} }).success, key).toBe(false);
});

it("does not declare any model-backed generation route without a greenfield owner", () => {
  const declared = Object.values(operations).map(
    (definition) => `${definition.method} ${definition.path}`,
  );
  for (const [method, path] of withheldRoutes)
    expect(declared, `${method} ${path}`).not.toContain(`${method} ${path}`);
});

it("declares the five supported phases with the truthful explicit paid intent", () => {
  const declared = Object.values(operations).filter((definition) =>
    nativeGenerationRoutes.some(
      ([method, path]) =>
        definition.method === method && definition.path === path,
    ),
  );
  expect(declared).toHaveLength(nativeGenerationRoutes.length);
  for (const definition of declared) {
    // A paid route declares no idempotency header at all: the intent is the
    // body's `paidGeneration`, which must be exactly `true`.
    expect(definition.idempotency, definition.path).toBeUndefined();
    expect(
      definition.request.safeParse({
        params: { draftId: "00000000-0000-4000-8000-000000000001" },
        body: { expectedRevision: 4, paidGeneration: true },
      }).success,
      definition.path,
    ).toBe(true);
    for (const body of [
      { expectedRevision: 4 },
      { expectedRevision: 4, paidGeneration: false },
      { expectedRevision: 4, paidGeneration: true, extra: 1 },
    ])
      expect(
        definition.request.safeParse({
          params: { draftId: "00000000-0000-4000-8000-000000000001" },
          body,
        }).success,
        `${definition.path} ${JSON.stringify(body)}`,
      ).toBe(false);
    // A borrowed idempotency key is no longer part of a paid request at all.
    expect(
      definition.request.safeParse({
        params: { draftId: "00000000-0000-4000-8000-000000000001" },
        body: { expectedRevision: 4, paidGeneration: true },
        idempotencyKey: "paid-generation-ack",
      }).success,
      definition.path,
    ).toBe(false);
  }
});

it("refuses a drifted agent state instead of coercing it", () => {
  expect(documentAgentState.safeParse(stateFixture).success).toBe(true);
  expect(
    documentAgentState.safeParse({ ...stateFixture, phase: "unknown-phase" })
      .success,
  ).toBe(false);
  expect(
    documentAgentState.safeParse({ ...stateFixture, revision: -1 }).success,
  ).toBe(false);
  expect(
    documentAgentState.safeParse({ ...stateFixture, inventedField: true })
      .success,
  ).toBe(false);
});

it("accepts the delivered run-status shape and refuses drift", () => {
  const run = {
    runId: "run-1",
    status: "active",
    stage: "drafting",
    stages: [{ name: "drafting", status: "active" }],
    sectionStates: {
      s1: { status: "succeeded", contentHash: "h1" },
      s2: { status: "failed", error: "provider refused" },
    },
    provider: "bedrock",
    model: "qwen.qwen3-coder-next",
  };
  expect(generationRunStatus.safeParse(run).success).toBe(true);
  expect(
    generationRunStatus.safeParse({
      ...run,
      sectionStates: { s1: { status: "queued", extra: 1 } },
    }).success,
  ).toBe(false);
  expect(generationRunStatus.safeParse({ ...run, extra: true }).success).toBe(
    false,
  );
});

it("requires at least one source and no unknown field on intake", () => {
  expect(intakeBody.safeParse(intakeFixture).success).toBe(true);
  expect(
    intakeBody.safeParse({ ...intakeFixture, invented: "field" }).success,
  ).toBe(false);
  expect(intakeBody.safeParse({ ...intakeFixture, goal: "ab" }).success).toBe(
    false,
  );
});

it("pins the exact revision on every approval request", () => {
  const approvals = [
    "workspace.generation.brief.approve",
    "workspace.generation.brief.reopen",
    "workspace.generation.context.approve",
    "workspace.generation.outline.approve",
    "workspace.generation.cancel",
  ] as const;
  for (const key of approvals) {
    const definition = operations[key];
    expect(
      definition.request.safeParse({ params: { draftId } }).success,
      key,
    ).toBe(false);
    expect(
      definition.request.safeParse({
        params: { draftId },
        body: { expectedRevision: 4 },
      }).success,
      key,
    ).toBe(true);
    expect(
      definition.request.safeParse({
        params: { draftId },
        body: { expectedRevision: 4, extra: true },
      }).success,
      key,
    ).toBe(false);
  }
});

it("pins the revision and the proposal on a decision request", () => {
  const definition = operations["workspace.generation.proposal.accept"];
  expect(
    definition.request.safeParse({
      params: { draftId, proposalId },
      body: { expectedRevision: 2 },
    }).success,
  ).toBe(true);
  expect(
    definition.request.safeParse({ params: { draftId, proposalId }, body: {} })
      .success,
  ).toBe(false);
  expect(
    definition.request.safeParse({
      params: { draftId, proposalId: "not-a-uuid" },
      body: { expectedRevision: 2 },
    }).success,
  ).toBe(false);
});

it("pins the issue and revision on a quality fix request", () => {
  const definition = operations["workspace.generation.quality.fix"];
  expect(
    definition.request.safeParse({
      params: { draftId, issueId },
      body: { expectedRevision: 7 },
    }).success,
  ).toBe(true);
  expect(
    definition.request.safeParse({
      params: { draftId },
      body: { expectedRevision: 7 },
    }).success,
  ).toBe(false);
});
