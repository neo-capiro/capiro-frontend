import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ObjectiveQuestionsPanel } from "../src/features/portfolio/objectives/questions/ObjectiveQuestionsPanel";
import { QuestionCard } from "../src/features/portfolio/objectives/questions/QuestionCard";
const fixture = vi.hoisted(() => ({
  data: undefined as any,
  error: undefined as any,
  loading: false,
  actor: {
    tenantId: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
  },
  allowed: true,
}));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
vi.mock("../src/features/portfolio/files/public", () => ({
  FileVersionHistory: () => null,
  useFiles: () => ({ data: [], isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({ useCapiro: () => ({ request: vi.fn() }) }));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: fixture.data,
    loading: fixture.loading,
    error: fixture.error,
    reload: vi.fn(),
  }),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({ isFetching: false }),
}));
vi.mock("../src/shared/portfolio/auth/client-writer", () => ({
  currentClientWriter: () => (fixture.allowed ? fixture.actor : null),
  assertClientWriter: vi.fn(),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: "authorized-client",
    client: { id: "00000000-0000-4000-8000-000000000003", status: "active" },
  }),
}));
const objective = { id: id(4), clientId: id(3), version: 7 } as any;
const question = {
  id: id(5),
  version: 2,
  title: "Synthetic retained question",
  status: "answered",
  answer: "Synthetic retained answer",
  evidenceNote: "Reviewed Objective context",
  sourceObjectiveVersion: 7,
  sourceRevisionId: id(6),
  evidenceKind: "objective_context",
  stale: false,
} as const;
beforeEach(() => {
  fixture.allowed = true;
  fixture.loading = false;
  fixture.error = undefined;
  fixture.data = {
    clientId: id(3),
    objectiveId: id(4),
    objectiveVersion: 7,
    items: [question],
    total: 1,
    openCount: 0,
    nextCursor: null,
  };
});
function render() {
  return renderToStaticMarkup(
    createElement(ObjectiveQuestionsPanel, {
      objective,
      canEdit: true,
      onReloadObjective: vi.fn(),
    }),
  );
}
it("shows current questions and the actual limited evidence contract", () => {
  const html = render();
  expect(html).toContain(question.answer);
  expect(html).toContain("client document versions or retained news observations");
  expect(html).toContain("0 open");
});
it.each(["loading", "error", "foreign", "stale", "denied"])(
  "suppresses retained content for %s observation",
  (mode) => {
    if (mode === "loading") fixture.loading = true;
    if (mode === "error") fixture.error = Error("Unavailable");
    if (mode === "foreign") fixture.data.objectiveId = id(90);
    if (mode === "stale") fixture.data.objectiveVersion = 8;
    if (mode === "denied") fixture.allowed = false;
    expect(render()).not.toContain(question.answer);
  },
);
it("stale answered source disables close and offers explicit reopen", () => {
  const html = renderToStaticMarkup(
    createElement(QuestionCard, {
      objective,
      question: { ...question, stale: true },
      disabled: false,
      session: {} as any,
    }),
  );
  expect(html).toMatch(/disabled="">Close question/);
  expect(html).toContain("Reopen for review");
});
it("stale open source asks for current review, not an unavailable reopen action", () => {
  const html = renderToStaticMarkup(
    createElement(QuestionCard, {
      objective,
      question: { ...question, status: "open", answer: null, evidenceNote: null, stale: true },
      disabled: false,
      session: {} as any,
    }),
  );
  expect(html).toContain("Review its current context before saving an answer.");
  expect(html).not.toContain("Reopen for review");
});

it("unavailable citation projection does not expose dependent answer or source labels", () => {
  const html = renderToStaticMarkup(
    createElement(QuestionCard, {
      objective,
      question: {
        ...question,
        answer: null,
        evidenceNote: null,
        evidenceKind: "cited_sources",
        evidenceState: "unavailable",
        evidenceRefs: [],
        stale: true,
      },
      disabled: false,
      session: {} as any,
    }),
  );
  expect(html).not.toContain(question.answer);
  expect(html).toContain("answer and evidence note are withheld");
  expect(html).toMatch(/disabled="">Close question/);
});
