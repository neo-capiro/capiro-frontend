import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import {
  intakeBody,
  type DocumentAgentState,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { GenerationPanelHost } from "./GenerationPanelHost";
import { intakeDigest, intakeIdempotencyKey } from "./intake-recovery";

// The mounted host, rendered for real (react-dom/server, node environment - no
// browser, no server, no network). The Capiro client, the query hook and the
// role hook are the only things replaced: everything below them is the shipped
// component tree, so these cases prove what a Workspace draft screen actually
// renders for a given acting role and document state.

const draftId = "00000000-0000-4000-8000-000000000001";
const responses = vi.hoisted(() => ({
  byKey: {} as Record<string, unknown>,
  requested: [] as string[],
  enabled: [] as Array<[string, boolean]>,
}));
const acting = vi.hoisted(() => ({
  role: null as "owner" | "editor" | "reviewer" | "commenter" | "viewer" | null,
  actor: undefined as unknown,
}));
const request = vi.hoisted(() => vi.fn(async () => ({})));
// The canonical journal's hydration hook is the storage edge: it is replaced so
// these cases can state what a reload actually finds retained. The journal
// module itself is the shipped one; nothing below the hook is substituted.
const journal = vi.hoisted(() => ({
  ready: true,
  record: null as unknown,
  error: undefined as unknown,
}));

vi.mock("../../../../shared/capiro/queries", () => ({
  useCapiroQuery: (
    key: string,
    _input: unknown,
    options?: { enabled?: boolean },
  ) => {
    responses.requested.push(key);
    responses.enabled.push([key, options?.enabled ?? true]);
    return {
      data: responses.byKey[key],
      loading: false,
      error: undefined,
      reload: vi.fn(),
    };
  },
}));
vi.mock("../../../../shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request }),
}));
vi.mock("./use-action-role", () => ({
  useWorkspaceActionRole: () => ({
    role: acting.role,
    actor: acting.actor,
    loading: false,
    error: undefined,
    reload: vi.fn(),
  }),
}));
vi.mock("../../../../shared/session/recovery/useRetainedIntent", () => ({
  useRetainedIntent: () => ({
    ready: journal.ready,
    loading: !journal.ready,
    error: journal.error,
    record: journal.record,
    retry: vi.fn(),
    verify: vi.fn(),
    guard: vi.fn(),
    signal: () => new AbortController().signal,
    install: vi.fn(),
    block: vi.fn(),
  }),
}));

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

beforeEach(() => {
  responses.byKey = {};
  responses.requested = [];
  responses.enabled = [];
  acting.role = "owner";
  acting.actor = {
    tenantId: "00000000-0000-4000-8000-0000000000aa",
    userId: "00000000-0000-4000-8000-0000000000bb",
    clerkUserId: "user_clerk_1",
  };
  journal.ready = true;
  journal.record = null;
  journal.error = undefined;
  request.mockClear();
});

/** The acting identity these cases mount as. */
const actingActor = {
  tenantId: "00000000-0000-4000-8000-0000000000aa",
  userId: "00000000-0000-4000-8000-0000000000bb",
  clerkUserId: "user_clerk_1",
};

/** One retained attempt, as a reload would find it in the journal. */
const retained = (over: Record<string, unknown> = {}) => {
  const body = intakeBody.parse({
    goal: "Defend the 2027 program",
    blueprintVersionId: "bp-1",
    factualAttachmentIds: ["att-1"],
    sampleAttachmentIds: [],
    priorWorkspaceDraftIds: [],
  });
  const digest = intakeDigest(body);
  return {
    fence: "00000000-0000-4000-8000-0000000000cc",
    key: intakeIdempotencyKey(actingActor, digest),
    digest,
    body,
    ...over,
  };
};

it("mounts the document-agent panel on the draft and issues only the allowed reads", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.proposals"] = { proposals: [] };
  responses.byKey["workspace.generation.status"] = { run: null };
  responses.byKey["workspace.generation.intake.capability"] = {
    enabled: false,
  };
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(html).toContain("Document agent");
  expect(html).toContain("revision 4");
  expect(html).toContain("Defend the program");
  // Capability off is reported, not silently rendered as a dead submit.
  expect(html).toContain("Two-step drafting is not enabled");
  expect(responses.requested).toEqual([
    "workspace.generation.state",
    "workspace.generation.proposals",
    "workspace.generation.status",
    "workspace.generation.quality",
    "workspace.generation.intake.capability",
    "workspace.generation.run.status",
    // The intake panel declares the same run read for the run its own receipt
    // would name; it has no receipt yet, so it issues nothing either.
    "workspace.generation.run.status",
  ]);
  // No active run and no intake receipt, so both run reads are declared but not
  // enabled: neither ever issues a request for a missing run id.
  expect(responses.enabled).toContainEqual([
    "workspace.generation.run.status",
    false,
  ]);
  expect(
    responses.enabled.filter(([key]) => key === "workspace.generation.run.status"),
  ).toHaveLength(2);
  // Rendering never dispatches anything.
  expect(request).not.toHaveBeenCalled();
});

it("renders the real edit controls for an acting owner and none of them execute on render", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.proposals"] = { proposals: [] };
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  for (const label of [
    "Save brief",
    "Approve brief",
    "Approve context",
    "Approve outline",
  ])
    expect(html, label).toContain(label);
  expect(html).not.toContain("requires the owner, editor or reviewer role");
  expect(request).not.toHaveBeenCalled();
});

it("resolves the acting role from the collaboration owner and refuses without it", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.proposals"] = { proposals: [] };
  const refusal = "requires the owner, editor or reviewer role";
  for (const role of ["viewer", "commenter", null] as const) {
    acting.role = role;
    const html = renderToStaticMarkup(
      createElement(GenerationPanelHost, { draftId }),
    );
    // The document still renders, but every write control is shown refused: no
    // unmounted role is manufactured into an editing role.
    expect(html, String(role)).toContain("Document agent");
    expect(html, String(role)).toContain(refusal);
    expect(html, String(role)).toContain("Editing this document requires");
  }
  // A commenter may still read, and never gains the edit controls.
  acting.role = "viewer";
  const readOnly = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(readOnly).toContain("Defend the program");
});

it("renders the supported generated phases as real controls, gated by their pins", () => {
  responses.byKey["workspace.generation.state"] = {
    state: state({
      goal: { text: "Defend the program", createdAt: "2026-10-28T00:00:00.000Z" },
      blueprintPin: {
        blueprintId: "00000000-0000-4000-8000-0000000000cc",
        versionId: "00000000-0000-4000-8000-0000000000dd",
        version: 1,
        definitionHash: "a".repeat(64),
      },
    }),
  };
  responses.byKey["workspace.generation.proposals"] = { proposals: [] };
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  for (const label of [
    "Synthesize brief",
    "Recommend context",
    "Analyze context",
    "Generate outline",
    "Generate document",
  ])
    expect(html, label).toContain(label);
  // Generation is gated on the approval pins: with an unapproved brief the
  // control is offered refused, not silently missing.
  expect(html).toContain("Approve the brief before starting generation.");
  expect(request).not.toHaveBeenCalled();
});

it("renders the real intake submit once the capability is on, and refuses it for a read-only role", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.intake.capability"] = {
    enabled: true,
  };
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(html).toContain("Two-step intake");
  expect(html).toContain("durable run, idempotent submit");
  expect(html).toContain("Submit intake");
  // The traced legacy owner no longer serves this submit: the run it queues is
  // drafted by the greenfield native conversation owner.
  expect(html).not.toContain("GenerationService");
  expect(html).not.toContain("legacy provider generation");
  expect(html).not.toContain("MeriV2 orchestrator proxy");
  // No receipt exists yet, so the caller's own run read is declared but not
  // enabled, and rendering dispatches nothing.
  expect(responses.enabled).toContainEqual([
    "workspace.generation.run.status",
    false,
  ]);
  expect(request).not.toHaveBeenCalled();

  // A read-only role keeps the control visible and refused, with the same guard
  // reason the dispatcher would apply - never a silently missing control.
  acting.role = "viewer";
  const readOnly = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(readOnly).toContain("Submit intake");
  expect(readOnly).toContain(
    "Editing this document requires the owner, editor or reviewer role.",
  );
  expect(request).not.toHaveBeenCalled();
});

it("recovers the attempt a reload finds retained instead of submitting another one", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.intake.capability"] = { enabled: true };
  responses.byKey["workspace.generation.run.status"] = {
    runId: "run-1",
    status: "active",
    stage: "drafting",
    stages: [],
    sectionStates: {},
  };
  journal.record = retained({
    receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 2 },
  });
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  // The confirmed attempt is read back rather than re-sent: the panel names the
  // run that request started and reads that run's own status.
  expect(html).toContain("Already submitted: this request started run run-1.");
  expect(html).toContain("stage drafting");
  expect(responses.enabled).toContainEqual([
    "workspace.generation.run.status",
    true,
  ]);
  expect(html).not.toContain("Submit intake");
  expect(request).not.toHaveBeenCalled();
});

it("offers a lost answer its own check, and never sends by itself", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.intake.capability"] = { enabled: true };
  journal.record = retained();
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(html).toContain("Check the interrupted submit");
  expect(html).toContain("no confirmed receipt");
  // No receipt means no run to read, and rendering dispatches nothing.
  expect(responses.enabled).toContainEqual([
    "workspace.generation.run.status",
    false,
  ]);
  expect(html).not.toContain("Submit intake");
  expect(request).not.toHaveBeenCalled();
});

it("holds every command while recovery storage is unresolved, and offers its retry", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.intake.capability"] = { enabled: true };
  journal.ready = false;
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(html).toContain("Recovery storage is being checked");
  expect(request).not.toHaveBeenCalled();

  journal.ready = true;
  journal.error = "Recovery storage is unavailable in this browser.";
  const blocked = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(blocked).toContain("Recovery storage is unavailable in this browser.");
  expect(blocked).toContain("Retry recovery");
  expect(request).not.toHaveBeenCalled();
});

it("offers the continuation of the receipt's own run, and reports a resolved one", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.intake.capability"] = { enabled: true };
  responses.byKey["workspace.generation.run.status"] = {
    runId: "run-1",
    status: "active",
    stage: "drafting",
    stages: [],
    sectionStates: {},
  };
  journal.record = retained({
    receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 2 },
  });
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  // The run this surface's own receipt named is offered an explicit
  // continuation, and rendering it dispatches nothing. (The read-only refusal of
  // the same control is pinned by `intake-panel-action.test.ts`.)
  expect(html).toContain("Continue this run");
  expect(html).not.toContain("does not generate");
  expect(request).not.toHaveBeenCalled();

  // A run the worker already resolved does not generate at all: the control
  // reports that state instead of promising a resume.
  responses.byKey["workspace.generation.run.status"] = {
    runId: "run-1",
    status: "partial",
    stage: "complete",
    stages: [],
    sectionStates: { s1: { status: "succeeded", contentHash: "h1" } },
  };
  const resolved = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(resolved).toContain("Continue this run");
  expect(resolved).toContain("does not generate");
  expect(request).not.toHaveBeenCalled();
});

it("keeps the dismissal of a settled attempt visible on the unchanged replay path", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.intake.capability"] = { enabled: true };
  journal.record = retained({
    receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 2 },
  });
  // The unchanged (prefilled) form plans the receipt's own replay reading, so this
  // is the path a reload with a settled attempt actually takes.
  responses.byKey["workspace.generation.run.status"] = {
    runId: "run-1",
    status: "partial",
    stage: "complete",
    stages: [],
    sectionStates: { s1: { status: "succeeded", contentHash: "h1" } },
  };
  const settled = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(settled).toContain(
    "Already submitted: this request started run run-1.",
  );
  // The attempt's own settled state is what offers the dismissal, so the control
  // is not lost merely because the form still plans the receipt's replay.
  expect(settled).toContain("Dismiss this attempt");
  expect(request).not.toHaveBeenCalled();

  // A live run is not settled: the attempt stays retained and is not dismissable.
  responses.byKey["workspace.generation.run.status"] = {
    runId: "run-1",
    status: "active",
    stage: "drafting",
    stages: [],
    sectionStates: {},
  };
  const live = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(live).toContain("Already submitted: this request started run run-1.");
  expect(live).not.toContain("Dismiss this attempt");

  // Nor is a run whose status is unknown: an unrecognised status is not a
  // resolved one, so the attempt stays retained.
  responses.byKey["workspace.generation.run.status"] = {
    runId: "run-1",
    status: "unknown",
    stage: "drafting",
    stages: [],
    sectionStates: {},
  };
  const unknown = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(unknown).not.toContain("Dismiss this attempt");
  expect(unknown).not.toContain("Submit intake");

  // And a read that never confirmed the run leaves it retained too.
  delete responses.byKey["workspace.generation.run.status"];
  const absent = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(absent).not.toContain("Dismiss this attempt");
  expect(request).not.toHaveBeenCalled();
});

it("keeps the retained check visible but refused for a read-only role", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.intake.capability"] = { enabled: true };
  journal.record = retained();
  acting.role = "viewer";
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  // The attempt is still offered its own check - never hidden by the role - and
  // the control reports the same guard reason the dispatcher would apply.
  expect(html).toContain("Check the interrupted submit");
  expect(html).toContain(
    "Editing this document requires the owner, editor or reviewer role.",
  );
  expect(html).toContain("no confirmed receipt");
  expect(request).not.toHaveBeenCalled();
});
