import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { draft } from "./prospect-resources-fixtures";
import { copyBody, copySource, copyIds } from "./workspace-brief-copy-fixtures";
import { createNewsletter } from "../src/features/modules/workspace/newsletter/newsletter-model";
import { useNewsletter } from "../src/features/modules/workspace/newsletter/use-newsletter";
import type { WorkspaceDraftDocument } from "../src/shared/capiro/operations/workspace-documents";

const captured = vi.hoisted(() => ({
  writes: [] as { key: string; input: unknown }[],
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({ data: { items: [] } }),
  useCapiroMutation: (key: string) => ({
    pending: false,
    run: async (input: unknown) => {
      captured.writes.push({ key, input });
      return {};
    },
  }),
}));
const capture = vi.fn<(view: ReturnType<typeof useNewsletter>) => void>();
function Projection({ existing }: { existing: WorkspaceDraftDocument }) {
  const view = useNewsletter({
    existing,
    initialClientId: "",
    onClose: () => {},
  });
  capture(view);
  return createElement("pre", null, JSON.stringify(view.body));
}
beforeEach(() => {
  captured.writes.length = 0;
  capture.mockClear();
});
it("ordinary newsletter initialization and save skip a preceding bound tab with arbitrary newsletter metadata", async () => {
  const newsletter = createNewsletter("blank");
  const existing = {
    ...draft,
    documents: [
      {
        ...draft.documents[0]!,
        id: copyIds.document,
        body: copyBody,
        sourceBriefVersion: copySource,
      },
      {
        ...draft.documents[0]!,
        id: copyIds.other,
        body: { blocks: [], newsletter },
        sourceBriefVersion: null,
      },
    ],
  };
  renderToStaticMarkup(createElement(Projection, { existing }));
  const view = capture.mock.lastCall![0];
  expect(view.body).toEqual(newsletter);
  expect(view.documentId).toBe(copyIds.other);
  await view.save();
  expect(captured.writes[0]).toMatchObject({
    key: "workspace.document.update",
    input: { params: { docId: copyIds.other } },
  });
  expect(
    captured.writes.every(
      (write) => !JSON.stringify(write.input).includes(copyIds.document),
    ),
  ).toBe(true);
});
it("a bound-only draft cannot dispatch ordinary newsletter PATCH or snapshot", async () => {
  const existing = {
    ...draft,
    documents: [
      {
        ...draft.documents[0]!,
        body: copyBody,
        sourceBriefVersion: copySource,
      },
    ],
  };
  renderToStaticMarkup(createElement(Projection, { existing }));
  const view = capture.mock.lastCall![0];
  expect(view.documentId).toBeUndefined();
  await view.save();
  expect(captured.writes).toEqual([]);
});
