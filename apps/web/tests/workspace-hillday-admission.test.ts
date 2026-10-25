import { beforeEach, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HillDayEditor } from "../src/features/modules/workspace/hillday/HillDayEditor";
import type { HillDayDocument } from "../src/shared/capiro/operations/workspace-schemas";
import { draft, otherId, prospectId } from "./prospect-resources-fixtures";

const h = vi.hoisted(() => ({
  row: undefined as HillDayDocument | undefined,
  mutation: vi.fn(),
  reload: vi.fn(),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => ({
    data: key === "workspace.hillday.document" ? h.row : { checks: [] },
    loading: false,
    reload: h.reload,
  }),
  useCapiroMutation: () => ({ run: h.mutation, pending: false }),
}));
vi.mock(
  "../src/features/modules/workspace/hillday/HillDaySectionEditors",
  () => ({
    FirstPageEditor: () => null,
    SectionEditor: () => null,
  }),
);
vi.mock("../src/features/modules/workspace/hillday/HillDayExport", () => ({
  HillDayExport: () => null,
}));
vi.mock("../src/shared/module-ui", () => {
  const children = ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children);
  return {
    ActionButton: children,
    Badge: children,
    Modal: () => null,
    DataTable: () => null,
    StatusPanel: ({
      children: content,
      error,
    }: {
      children?: ReactNode;
      error?: string;
    }) =>
      error
        ? createElement("p", { role: "alert" }, error)
        : createElement("div", null, content),
  };
});
const render = (expectedClientId?: string) =>
  renderToStaticMarkup(
    createElement(HillDayEditor, {
      id: draft.id,
      expectedClientId,
      onClose: vi.fn(),
    }),
  );
beforeEach(() => {
  vi.clearAllMocks();
  h.row = {
    id: draft.id,
    name: "Synthetic Hill Day",
    status: "draft",
    client: {
      id: otherId,
      name: "Synthetic client",
      mono: "SC",
      hasLogo: false,
    },
    firm: { name: "Synthetic firm" },
    owner: { id: "test-user", name: "Test", initials: "T" },
    timeZone: "UTC",
    lookbackDays: 30,
    updatedAt: "2026-10-25T00:00:00Z",
    createdAt: "2026-10-25T00:00:00Z",
    meetingCount: 0,
    cover: { title: "Synthetic schedule", dateline: "Saved date", facts: [] },
    firstPage: null,
    summary: [],
    summaryColumns: [],
    sections: [],
    provenance: {
      generatedAt: null,
      model: null,
      sourceCounts: [],
      corrections: [],
      failedUnits: 0,
      quality: null,
      totalSources: 0,
    },
    generation: { lastJobId: null, status: null },
  };
});
it("refuses a different Hill Day receipt before showing its content or controls", () => {
  h.row!.id = prospectId;
  const html = render();
  expect(html).toContain("does not match this link");
  expect(html).not.toContain("Synthetic schedule");
  expect(html).not.toContain("Edit first page");
  expect(h.mutation).not.toHaveBeenCalled();
});
it("refuses a moved Hill Day client even when its document ID matches", () => {
  const html = render(prospectId);
  expect(html).toContain("client scope");
  expect(html).not.toContain("Synthetic schedule");
  expect(h.mutation).not.toHaveBeenCalled();
});
it.each([undefined, otherId])(
  "opens a current receipt read-only on entry in scope %s",
  (clientId) => {
    const html = render(clientId);
    expect(html).toContain("Synthetic schedule");
    expect(html).not.toContain('role="alert"');
    expect(h.mutation).not.toHaveBeenCalled();
  },
);
