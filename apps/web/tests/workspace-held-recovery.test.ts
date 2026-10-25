import { beforeEach, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceDraft } from "../src/features/modules/workspace/WorkspaceDraft";
import type { WorkspaceDraftDocument } from "../src/shared/capiro/operations/workspace-documents";
import { draft } from "./prospect-resources-fixtures";

const h = vi.hoisted(() => ({
  row: undefined as WorkspaceDraftDocument | undefined,
  reload: vi.fn(),
  binding:
    vi.fn<
      (props: {
        draft: WorkspaceDraftDocument;
        onBound: (draft: WorkspaceDraftDocument) => void;
      }) => void
    >(),
  inputs:
    vi.fn<
      (props: {
        value: string;
        onChange: (event: { target: { value: string } }) => void;
      }) => void
    >(),
  buttons:
    vi.fn<
      (props: { children: ReactNode; onClick: () => Promise<void> }) => void
    >(),
  update: vi.fn(),
  snapshot: vi.fn(),
  values: [] as unknown[],
  index: 0,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = h.index++;
    if (index === h.values.length) h.values.push(initial);
    return [
      h.values[index],
      (next: unknown) => {
        h.values[index] =
          typeof next === "function" ? next(h.values[index]) : next;
      },
    ];
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => ({
    data:
      key === "workspace.draft"
        ? h.row
        : key === "workspace.draft.versions"
          ? []
          : {},
    reload: h.reload,
    loading: false,
  }),
  useCapiroMutation: (key: string) => ({
    run: key === "workspace.draft.update" ? h.update : h.snapshot,
    pending: false,
  }),
}));
vi.mock("../src/features/modules/workspace/DraftClientAssociation", () => ({
  DraftClientAssociation: (props: Parameters<typeof h.binding>[0]) => {
    h.binding(props);
    return null;
  },
}));
vi.mock(
  "../src/features/modules/workspace/prospects/useProspectDraftSave",
  () => ({ useProspectDraftSave: vi.fn() }),
);
vi.mock(
  "../src/features/modules/workspace/prospects/ProspectDraftExport",
  () => ({ ProspectDraftExport: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/newsletter/NewsletterWorkflow",
  () => ({ NewsletterWorkflow: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/rich-document/DocumentPreview",
  () => ({ DocumentPreview: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/rich-document/SectionEditor",
  () => ({ SectionEditor: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/rich-document/SectionPreview",
  () => ({ SectionPreview: () => null }),
);
vi.mock("../src/features/modules/workspace/brief-copy/CopiedTabs", () => ({
  CopiedTabs: () => null,
}));
vi.mock("../src/shared/module-ui", () => {
  const children = ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children);
  const input = (props: Parameters<typeof h.inputs>[0]) => {
    h.inputs(props);
    return null;
  };
  return {
    ActionButton: (props: Parameters<typeof h.buttons>[0]) => {
      h.buttons(props);
      return createElement("button", null, props.children);
    },
    Field: children,
    Panel: children,
    StatusPanel: children,
    Modal: () => null,
    TextInput: input,
    TextArea: input,
  };
});
function render(expectedClientId?: string) {
  h.index = 0;
  return renderToStaticMarkup(
    createElement(WorkspaceDraft, {
      id: draft.id,
      expectedClientId,
      onClose: vi.fn(),
    }),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  h.values = [];
  h.row = {
    ...draft,
    prospectId: null,
    clientId: null,
    client: "Legacy client",
    clientAssociation: "held",
    config: { sections: ["Body"], sectionContent: { Body: "Saved body" } },
  };
  h.update.mockResolvedValue({});
  h.snapshot.mockResolvedValue({});
});

it.each([
  { clientId: undefined, clientAssociation: undefined },
  { clientId: null, clientAssociation: undefined },
  {
    clientId: "90000000-0000-4000-8000-000000000001",
    clientAssociation: undefined,
  },
  {
    clientId: "10000000-0000-4000-8000-000000000001",
    clientAssociation: "held" as const,
  },
])(
  "refuses a moved or unresolved ordinary client binding before editor hydration: %j",
  (binding) => {
    h.row = { ...h.row!, ...binding };
    expect(render("10000000-0000-4000-8000-000000000001")).toContain(
      "Document unavailable",
    );
    expect(h.inputs).not.toHaveBeenCalled();
    expect(h.binding).not.toHaveBeenCalled();
    expect(h.update).not.toHaveBeenCalled();
    expect(h.snapshot).not.toHaveBeenCalled();
  },
);

it("opens the existing ordinary editor for its current canonical client", () => {
  const clientId = "10000000-0000-4000-8000-000000000001";
  h.row = { ...h.row!, clientId, clientAssociation: undefined };
  expect(render(clientId)).not.toContain("Document unavailable");
  expect(h.inputs).toHaveBeenCalled();
  expect(h.update).not.toHaveBeenCalled();
  expect(h.snapshot).not.toHaveBeenCalled();
});
it("adopts a confirmed client without reloading or losing unsaved ordinary draft edits", async () => {
  render();
  const [title, body] = h.inputs.mock.calls.map(([props]) => props);
  title!.onChange({ target: { value: "Unsaved title" } });
  body!.onChange({ target: { value: "Unsaved body" } });
  render();
  const bound: WorkspaceDraftDocument = {
    ...h.row!,
    clientId: "10000000-0000-4000-8000-000000000001",
    client: "Bound client",
    clientAssociation: undefined,
  };
  h.binding.mock.lastCall![0].onBound(bound);
  const html = render();
  expect(h.reload).not.toHaveBeenCalled();
  expect(html).toContain("Bound client");
  expect(h.binding.mock.lastCall![0].draft).toBe(bound);
  expect(h.inputs.mock.calls.slice(-2).map(([props]) => props.value)).toEqual([
    "Unsaved title",
    "Unsaved body",
  ]);
  const save = h.buttons.mock.calls.findLast(
    ([props]) => props.children === "Save draft",
  )![0];
  await save.onClick();
  expect(h.update).toHaveBeenCalledWith({
    params: { id: draft.id },
    body: {
      docTitle: "Unsaved title",
      config: { sectionContent: { Body: "Unsaved body" } },
    },
  });
});
