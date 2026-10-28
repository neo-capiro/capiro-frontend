import { expect, it } from "vitest";
import type {
  AgentProposal,
  AgentRunSummary,
  DocumentAgentState,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import {
  workspaceRoleCanEdit,
  workspaceRoleCanRead,
  workspaceRoleCanReview,
  type ResolvedWorkspaceRole,
} from "./access";
import {
  classifyGenerationFailure,
  generationRecovery,
  mountReads,
  operationMethod,
} from "./controller";
import {
  planBriefApprove,
  planBriefEdit,
  planBriefReopen,
  planCancel,
  planContextApprove,
  planContextResolve,
  planOutlineApprove,
  planProposalAccept,
  planProposalReject,
  planQualityFix,
  planRetry,
} from "./plans";
import {
  briefApproval,
  contextApproval,
  outlineApproval,
  unitRetryPlan,
} from "./state";

const draftId = "00000000-0000-4000-8000-000000000001";
const conflictId = "conflict-1";
const proposalId = "00000000-0000-4000-8000-000000000009";

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

const proposal = (over: Partial<AgentProposal> = {}): AgentProposal => ({
  id: proposalId,
  tenantId: "tenant-1",
  draftId,
  createdById: "user-1",
  type: "outline_revision",
  status: "pending",
  baseRevision: 4,
  baseHash: "hash",
  payload: {},
  createdAt: "2026-10-28T00:00:00.000Z",
  decidedAt: null,
  decidedById: null,
  ...over,
});

const section = (id: string) => ({
  id,
  title: id,
  purpose: "purpose",
  instructions: "instructions",
  required: true,
  locked: false,
  targetWords: { min: 100, max: 400 },
  evidenceItemIds: [],
});

const run = (over: Partial<AgentRunSummary> = {}): AgentRunSummary => ({
  runId: "run-1",
  mode: "standard",
  startedAt: "2026-10-28T00:00:00.000Z",
  status: "partial",
  stages: [
    { name: "preflight", status: "done" },
    { name: "drafting", status: "active" },
    { name: "assurance", status: "failed" },
  ],
  sectionResults: {
    s1: { status: "succeeded" },
    s2: { status: "succeeded" },
    s3: { status: "failed" },
  },
  ...over,
});

const check = {
  id: "cite.missing",
  label: "Missing citation",
  status: "notable" as const,
  detail: "Claim 3 has no source",
  fixable: true,
  severity: "medium" as const,
};

// ── Reads never execute ──────────────────────────────────────────────────────

it("mounts reads that are all GETs and adds the run read only for an active run", () => {
  const reads = mountReads(draftId, state());
  expect(reads.length).toBeGreaterThan(0);
  for (const read of reads)
    expect(operationMethod(read.operation), read.id).toBe("GET");
  expect(reads.map((read) => read.id)).not.toContain("run");
  const withRun = mountReads(
    draftId,
    state({ generation: { mode: "standard", activeRunId: "run-7" } }),
  );
  const runRead = withRun.find((read) => read.id === "run");
  expect(runRead).toBeDefined();
  expect(runRead?.params).toEqual({ runId: "run-7" });
  expect(
    operationMethod(runRead?.operation ?? "workspace.generation.state"),
  ).toBe("GET");
});

// ── Failure classification and recovery ──────────────────────────────────────

it("classifies a revision conflict separately from a stale proposal", () => {
  expect(
    classifyGenerationFailure({
      status: 409,
      message: "Document agent revision conflict",
    }),
  ).toBe("stale-revision");
  expect(
    classifyGenerationFailure({
      status: 409,
      message: "Proposal is already stale",
    }),
  ).toBe("stale-proposal");
  expect(classifyGenerationFailure({ status: 403, message: "Forbidden" })).toBe(
    "refused",
  );
  expect(
    classifyGenerationFailure({ status: 401, message: "Unauthenticated" }),
  ).toBe("refused");
  expect(
    classifyGenerationFailure({ status: 404, message: "Draft not found" }),
  ).toBe("refused");
  expect(classifyGenerationFailure({ status: 422, message: "Invalid" })).toBe(
    "refused",
  );
  expect(classifyGenerationFailure({ status: 503, message: "upstream" })).toBe(
    "unknown",
  );
  expect(classifyGenerationFailure(new Error("fetch failed"))).toBe("unknown");
});

it("sends an ambiguous write back to a read and never to a blind retry", () => {
  expect(generationRecovery("unknown")).toBe("reconcile");
  expect(generationRecovery("stale-revision")).toBe("reconcile");
  expect(generationRecovery("stale-proposal")).toBe("reconcile");
  expect(generationRecovery("refused")).toBe("none");
  expect(generationRecovery("applied")).toBe("none");
  const reconcile = mountReads(draftId).filter((read) => read.id === "state");
  expect(reconcile.map((read) => operationMethod(read.operation))).toEqual([
    "GET",
  ]);
});

// ── Approval pins ────────────────────────────────────────────────────────────

it("pins the current revision on brief, outline and cancel requests", () => {
  const current = state({
    revision: 11,
    phase: "outline",
    outline: { version: 2, sections: [section("s1")] },
    generation: { mode: "standard", activeRunId: "run-3" },
  });
  for (const plan of [
    planBriefApprove(current, draftId),
    planOutlineApprove(current, draftId),
    planCancel(current, draftId),
  ]) {
    if (plan.kind !== "request")
      throw new Error(`expected a request, got ${plan.kind}`);
    expect(plan.input.body).toEqual({ expectedRevision: 11 });
  }
});

it("refuses an approval the server would refuse", () => {
  const approvedBrief = state({
    brief: {
      assumptions: [],
      provenance: {},
      objective: "x",
      approvedAt: "2026-10-28T00:00:00.000Z",
    },
  });
  expect(planBriefApprove(approvedBrief, draftId).kind).toBe("refusal");
  expect(briefApproval(approvedBrief)).toEqual({
    status: "approved",
    approvedAt: "2026-10-28T00:00:00.000Z",
  });
  expect(
    planBriefEdit(approvedBrief, draftId, { objective: "later" }).kind,
  ).toBe("refusal");
  expect(planBriefEdit(state(), draftId, { objective: "later" }).kind).toBe(
    "request",
  );
  expect(planBriefReopen(state(), draftId).kind).toBe("refusal");
  expect(planOutlineApprove(state(), draftId).kind).toBe("refusal");
  const noSections = planOutlineApprove(state(), draftId);
  expect(noSections.kind === "refusal" ? noSections.reason : "").toContain(
    "at least one section",
  );
  expect(planCancel(state(), draftId).kind).toBe("refusal");
});

it("blocks context approval while a conflict is open, and resolves it by pin", () => {
  const conflicted = state({
    phase: "context",
    contextPlan: {
      includedItemIds: ["item-1"],
      excludedItems: [],
      conflicts: [
        {
          id: conflictId,
          itemIds: ["item-1", "item-2"],
          type: "numeric",
          description: "Two figures disagree",
          recommendedResolution: "Keep the newer figure",
          resolved: false,
        },
      ],
      coverage: { plannedClaims: 1, supportedClaims: 1, missingClaims: [] },
    },
  });
  expect(contextApproval(conflicted)).toEqual({
    status: "blocked_conflicts",
    conflicts: 1,
  });
  expect(planContextApprove(conflicted, draftId).kind).toBe("refusal");
  const resolve = planContextResolve(
    conflicted,
    draftId,
    conflictId,
    "Keep the newer figure",
  );
  if (resolve.kind !== "request")
    throw new Error(`expected a request, got ${resolve.kind}`);
  expect(resolve.input.body).toEqual({
    conflictId,
    resolution: "Keep the newer figure",
    expectedRevision: 4,
  });
  expect(planContextResolve(conflicted, draftId, "missing", "x").kind).toBe(
    "refusal",
  );
});

it("refuses an outline approval with no sections and accepts a real one", () => {
  const ready = state({
    phase: "outline",
    outline: { version: 2, sections: [section("s1")] },
  });
  expect(outlineApproval(ready)).toEqual({ status: "awaiting_approval" });
  const plan = planOutlineApprove(ready, draftId);
  if (plan.kind !== "request")
    throw new Error(`expected a request, got ${plan.kind}`);
  expect(plan.input.body).toEqual({ expectedRevision: 4 });
});

// ── Stale proposals ──────────────────────────────────────────────────────────

it("refuses a stale, decided or unauthorised proposal decision", () => {
  expect(
    planProposalAccept(state({ revision: 9 }), draftId, proposal(), "editor")
      .kind,
  ).toBe("refusal");
  expect(
    planProposalAccept(
      state(),
      draftId,
      proposal({ baseRevision: 3 }),
      "editor",
    ).kind,
  ).toBe("refusal");
  expect(
    planProposalAccept(
      state(),
      draftId,
      proposal({ status: "accepted" }),
      "editor",
    ).kind,
  ).toBe("refusal");
  expect(planProposalAccept(state(), draftId, proposal(), "viewer").kind).toBe(
    "refusal",
  );
  expect(
    planProposalAccept(state(), draftId, proposal(), "reviewer").kind,
  ).toBe("request");
  const plan = planProposalAccept(state(), draftId, proposal(), "owner");
  if (plan.kind !== "request")
    throw new Error(`expected a request, got ${plan.kind}`);
  expect(plan.input.params).toEqual({ draftId, proposalId });
  const reject = planProposalReject(
    state(),
    draftId,
    proposal(),
    "owner",
    "Not needed",
  );
  if (reject.kind !== "request")
    throw new Error(`expected a request, got ${reject.kind}`);
  expect(reject.input.body).toEqual({
    expectedRevision: 4,
    note: "Not needed",
  });
});

// ── Cancellation and retry preserve successful units ─────────────────────────

it("retries only failed units and preserves the successful ones", () => {
  expect(unitRetryPlan(run())).toEqual({
    retryable: ["s3"],
    preserved: ["s1", "s2"],
  });
  const cancelled = unitRetryPlan(
    run({
      sectionResults: { s1: { status: "succeeded" }, s3: { status: "failed" } },
    }),
  );
  expect(cancelled.preserved).toEqual(["s1"]);
  expect(cancelled.retryable).toEqual(["s3"]);
  expect(unitRetryPlan(undefined)).toEqual({ retryable: [], preserved: [] });
});

it("withholds retry behind the greenfield owner but never discards produced units", () => {
  const plan = planRetry(run());
  expect(plan.kind).toBe("withheld");
  if (plan.kind !== "withheld") throw new Error("unreachable");
  expect(plan.reason).toContain("2 successful unit");
  expect(
    planRetry(run({ sectionResults: { s1: { status: "succeeded" } } })).kind,
  ).toBe("refusal");
});

// ── Quality ACL ──────────────────────────────────────────────────────────────

it("gates a quality fix on the editor ACL and the fixable flag", () => {
  expect(planQualityFix(state(), draftId, check, "viewer").kind).toBe(
    "refusal",
  );
  expect(planQualityFix(state(), draftId, check, "commenter").kind).toBe(
    "refusal",
  );
  expect(planQualityFix(state(), draftId, check, "reviewer").kind).toBe(
    "refusal",
  );
  expect(
    planQualityFix(state(), draftId, { ...check, fixable: false }, "editor")
      .kind,
  ).toBe("refusal");
  const plan = planQualityFix(state(), draftId, check, "owner");
  if (plan.kind !== "request")
    throw new Error(`expected a request, got ${plan.kind}`);
  expect(plan.operation).toBe("workspace.generation.quality.fix");
  expect(plan.input.params).toEqual({ draftId, issueId: check.id });
  expect(plan.input.body).toEqual({ expectedRevision: 4 });
});

it("mirrors the authoritative collaboration role matrix without widening it", () => {
  const roles: ResolvedWorkspaceRole[] = [
    "owner",
    "editor",
    "reviewer",
    "commenter",
    "viewer",
  ];
  expect(roles.filter(workspaceRoleCanEdit)).toEqual(["owner", "editor"]);
  expect(roles.filter(workspaceRoleCanReview)).toEqual([
    "owner",
    "editor",
    "reviewer",
  ]);
  expect(roles.filter(workspaceRoleCanRead)).toEqual(roles);
  expect(workspaceRoleCanRead(null)).toBe(false);
});

// ── Mode control and initialize live in generation-plans.test.ts ─────────────
