import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import type { DocumentAgentState } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { GenerationPanelHost } from "./GenerationPanelHost";

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
  request.mockClear();
});

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
  ]);
  // No active run, so the run read is declared but not enabled: it never issues
  // a request for a missing run id.
  expect(responses.enabled).toContainEqual([
    "workspace.generation.run.status",
    false,
  ]);
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

it("shows the traced legacy-generation reason instead of an intake submit button", () => {
  responses.byKey["workspace.generation.state"] = { state: state() };
  responses.byKey["workspace.generation.intake.capability"] = {
    enabled: true,
  };
  const html = renderToStaticMarkup(
    createElement(GenerationPanelHost, { draftId }),
  );
  expect(html).toContain("Two-step intake");
  expect(html).toContain("legacy provider generation");
  expect(html).toContain("GenerationService");
  expect(html).toContain("MeriV2 orchestrator proxy");
  expect(html).not.toContain("ws22-intake-");
});
