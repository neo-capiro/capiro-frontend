import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { draft } from "./prospect-resources-fixtures";
import { useNewsletter } from "../src/features/modules/workspace/newsletter/use-newsletter";
import {
  workspaceDocumentOperations,
  workspaceDraft,
  type WorkspaceDraftDocument,
} from "../src/shared/capiro/operations/workspace-documents";
import {
  libraryDocument,
  type WorkspaceLibraryDocument,
} from "../src/shared/capiro/operations/workspace-schemas";
import { DraftClientAssociation } from "../src/features/modules/workspace/DraftClientAssociation";
import { DocumentsLibrary } from "../src/features/modules/workspace/WorkspaceLibrary";
import { NewsletterWorkflow } from "../src/features/modules/workspace/newsletter/NewsletterWorkflow";

const h = vi.hoisted(() => ({
  clients: [] as { id: string; name: string }[],
  library: [] as WorkspaceLibraryDocument[],
  staging: vi.fn(),
  select: vi.fn<(props: { onValueChange: (value: string) => void }) => void>(),
  button:
    vi.fn<
      (props: { onClick: () => Promise<void>; disabled: boolean }) => void
    >(),
  run: {
    "workspace.draft.create": vi.fn(),
    "workspace.document.update": vi.fn(),
    "workspace.draft.update": vi.fn(),
    "workspace.draft.snapshot": vi.fn(),
  },
  values: [] as unknown[],
  refs: [] as { current: unknown }[],
  stateIndex: 0,
  refIndex: 0,
}));
// Keep the production hook and callbacks. The repository's node-only hook
// pattern supplies state cells for explicit rerenders; this is not a DOM test.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = h.stateIndex++;
      if (index === h.values.length)
        h.values.push(typeof initial === "function" ? initial() : initial);
      return [
        h.values[index],
        (next: unknown) => {
          h.values[index] =
            typeof next === "function" ? next(h.values[index]) : next;
        },
      ];
    },
    useRef: (initial: unknown) => {
      const index = h.refIndex++;
      if (index === h.refs.length) h.refs.push({ current: initial });
      return h.refs[index];
    },
    useEffect: () => {},
  };
});
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => ({
    data:
      key === "workspace.clients"
        ? { items: h.clients }
        : key === "workspace.documents"
          ? { items: h.library }
          : { tenant: { name: "Firm" }, user: { clerkUserId: "owner" } },
    loading: false,
    reload: vi.fn(),
  }),
  useCapiroMutation: (key: keyof typeof h.run) => ({
    run: h.run[key],
    pending: false,
  }),
}));
vi.mock("../src/features/modules/workspace/newsletter/NewsletterPaper", () => ({
  NewsletterPaper: () => null,
}));
vi.mock(
  "../src/features/modules/workspace/newsletter/NewsletterComments",
  () => ({ NewsletterComments: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/newsletter/NewsletterTemplates",
  () => ({ SelectTemplate: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/newsletter/NewsletterStaging",
  () => ({
    NewsletterStaging: () => {
      h.staging();
      return null;
    },
  }),
);
vi.mock("../src/shared/module-ui", () => ({
  Modal: () => null,
  UnavailableAction: () => null,
  Panel: ({ title, children }: { title?: string; children?: ReactNode }) =>
    createElement("section", null, title, children),
  StatusPanel: ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children),
  Field: ({ label, children }: { label: string; children: ReactNode }) =>
    createElement("label", null, label, children),
  SelectInput: (props: { onValueChange: (value: string) => void }) => {
    h.select(props);
    return null;
  },
  ActionButton: (props: {
    onClick: () => Promise<void>;
    disabled: boolean;
    children: ReactNode;
  }) => {
    h.button(props);
    return createElement(
      "button",
      { disabled: props.disabled },
      props.children,
    );
  },
  Badge: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
  TextInput: () => null,
  DataTable: ({
    rows,
    columns,
  }: {
    rows: WorkspaceLibraryDocument[];
    columns: {
      key: string;
      render: (row: WorkspaceLibraryDocument) => ReactNode;
    }[];
  }) =>
    createElement(
      "div",
      null,
      rows.flatMap((row) =>
        columns.map((column) =>
          createElement(
            "div",
            { key: row.id + column.key },
            column.render(row),
          ),
        ),
      ),
    ),
}));
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const record: WorkspaceDraftDocument = {
  ...draft,
  prospectId: null,
  clientId: A,
  docTitle: "Newsletter",
};
const capture = vi.fn<(view: ReturnType<typeof useNewsletter>) => void>();
function Projection(props: Parameters<typeof useNewsletter>[0]) {
  capture(useNewsletter(props));
  return null;
}
function renderElement(element: ReactElement) {
  h.stateIndex = 0;
  h.refIndex = 0;
  return renderToStaticMarkup(element);
}
function render(props: Parameters<typeof useNewsletter>[0]) {
  renderElement(createElement(Projection, props));
  return capture.mock.lastCall![0];
}
beforeEach(() => {
  h.clients = [
    { id: A, name: "Same name" },
    { id: B, name: "Same name" },
  ];
  h.values = [];
  h.refs = [];
  h.library = [];
  h.staging.mockClear();
  h.select.mockClear();
  h.button.mockClear();
  capture.mockClear();
  for (const run of Object.values(h.run)) run.mockReset().mockResolvedValue({});
  h.run["workspace.draft.create"].mockResolvedValue(record);
});

describe("newsletter client authority", () => {
  it("creates with the selected UUID despite duplicate names", async () => {
    const props = { initialClientId: A, onClose: vi.fn() };
    await render(props).save();
    expect(h.run["workspace.draft.create"]).toHaveBeenCalledWith({
      body: expect.objectContaining({ clientId: A }),
    });
    expect(h.run["workspace.draft.snapshot"]).toHaveBeenCalledOnce();
  });
  it("holds a removed client before create", async () => {
    h.clients = [];
    const props = { initialClientId: A, onClose: vi.fn() };
    await render(props).save();
    expect(h.run["workspace.draft.create"]).not.toHaveBeenCalled();
    expect(render(props).error?.message).toContain("unavailable");
  });
  it("reopens using the saved UUID and refuses reassignment", async () => {
    const props = { initialClientId: B, existing: record, onClose: vi.fn() };
    const view = render(props);
    expect(view.clientId).toBe(A);
    view.setClientId(B);
    await render(props).save();
    expect(h.run["workspace.document.update"]).not.toHaveBeenCalled();
    expect(render(props).error?.message).toContain("different client");
  });
  it("discards a pending create after the local client changes", async () => {
    let finish!: (value: WorkspaceDraftDocument) => void;
    h.run["workspace.draft.create"].mockReturnValue(
      new Promise<WorkspaceDraftDocument>((resolve) => {
        finish = resolve;
      }),
    );
    const props = { initialClientId: A, onClose: vi.fn() };
    const view = render(props);
    const saving = view.save();
    view.setClientId(B);
    finish(record);
    await saving;
    expect(render(props).draft).toBeUndefined();
    expect(h.run["workspace.document.update"]).not.toHaveBeenCalled();
  });
});

const held: WorkspaceDraftDocument = {
  ...record,
  clientId: null,
  client: "Legacy",
  clientAssociation: "held",
};
describe("held draft client recovery", () => {
  it("receives held flags and validates an explicit UUID binding request", () => {
    expect(workspaceDraft.parse(held).clientAssociation).toBe("held");
    const library = {
      id: record.id,
      kind: "draft",
      name: "Legacy",
      blueprint: "Document",
      client: "Legacy",
      clientId: null,
      clientAssociation: "held",
      status: "draft",
      updatedAt: record.updatedAt,
      owner: { id: "owner", name: "Owner", initials: "O" },
      route: "/modules/workspace",
    };
    expect(libraryDocument.parse(library).clientAssociation).toBe("held");
    expect(
      workspaceDocumentOperations["workspace.draft.update"].request.parse({
        params: { id: record.id },
        body: { clientId: A },
      }),
    ).toEqual({ params: { id: record.id }, body: { clientId: A } });
    expect(
      workspaceDocumentOperations["workspace.draft.update"].request.safeParse({
        params: { id: record.id },
        body: { clientId: "Legacy" },
      }).success,
    ).toBe(false);
  });
  it("shows recovery only for a held row and binds the selected UUID", async () => {
    const onBound = vi.fn();
    const props = { draft: held, onBound };
    expect(
      renderElement(createElement(DraftClientAssociation, props)),
    ).toContain("Choose a client to continue");
    h.select.mock.lastCall![0].onValueChange(A);
    const bound = { ...record, clientId: A };
    h.run["workspace.draft.update"].mockResolvedValue(bound);
    renderElement(createElement(DraftClientAssociation, props));
    await h.button.mock.lastCall![0].onClick();
    expect(h.run["workspace.draft.update"]).toHaveBeenCalledWith({
      params: { id: held.id },
      body: { clientId: A },
    });
    expect(onBound).toHaveBeenCalledWith(bound);
    expect(
      renderElement(
        createElement(DraftClientAssociation, { draft: bound, onBound }),
      ),
    ).toBe("");
  });
  it("keeps the draft held and displays a server wall refusal", async () => {
    const onBound = vi.fn();
    const props = { draft: held, onBound };
    renderElement(createElement(DraftClientAssociation, props));
    h.select.mock.lastCall![0].onValueChange(A);
    h.run["workspace.draft.update"].mockRejectedValue(
      new Error("Client access denied"),
    );
    renderElement(createElement(DraftClientAssociation, props));
    await h.button.mock.lastCall![0].onClick();
    expect(onBound).not.toHaveBeenCalled();
    expect(
      renderElement(createElement(DraftClientAssociation, props)),
    ).toContain("Client access denied");
  });
  it("rejects a successful response for a different client", async () => {
    const onBound = vi.fn();
    const props = { draft: held, onBound };
    renderElement(createElement(DraftClientAssociation, props));
    h.select.mock.lastCall![0].onValueChange(A);
    h.run["workspace.draft.update"].mockResolvedValue({
      ...record,
      clientId: B,
    });
    renderElement(createElement(DraftClientAssociation, props));
    await h.button.mock.lastCall![0].onClick();
    expect(onBound).not.toHaveBeenCalled();
    expect(
      renderElement(createElement(DraftClientAssociation, props)),
    ).toContain("not confirmed");
  });
  it("keeps unsaved newsletter edits when its held association is confirmed", async () => {
    const props = { initialClientId: "", existing: held, onClose: vi.fn() };
    let view = render(props);
    view.setTitle("Unsaved title");
    view.edit({ ...view.body, subject: "Unsaved subject" });
    view = render(props);
    view.acceptClientAssociation({ ...record, clientId: A });
    view = render(props);
    expect(view.clientId).toBe(A);
    expect(view.title).toBe("Unsaved title");
    expect(view.body.subject).toBe("Unsaved subject");
    await view.save();
    expect(h.run["workspace.document.update"]).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Unsaved title",
          body: expect.objectContaining({
            newsletter: expect.objectContaining({ subject: "Unsaved subject" }),
          }),
        }),
      }),
    );
  });
  it("refuses to mount staging for a held newsletter even on the stage view", () => {
    const props = { existing: held, onClose: vi.fn() };
    const first = renderElement(createElement(NewsletterWorkflow, props));
    expect(first).toContain('disabled="">Stage in Outreach');
    h.values[0] = "stage";
    expect(renderElement(createElement(NewsletterWorkflow, props))).toContain(
      "Choose a client to continue",
    );
    expect(h.staging).not.toHaveBeenCalled();
  });
  it("labels held library rows and excludes them from a client-filtered surface", () => {
    h.library = [
      {
        id: record.id,
        kind: "draft",
        name: "Legacy draft",
        blueprint: "Document",
        client: "Legacy",
        clientId: null,
        clientAssociation: "held",
        status: "draft",
        updatedAt: record.updatedAt,
        owner: { id: "owner", name: "Owner", initials: "O" },
        route: "/modules/workspace",
      },
    ];
    expect(
      renderElement(createElement(DocumentsLibrary, { onOpen: vi.fn() })),
    ).toContain("Choose a client to continue");
    expect(
      renderElement(
        createElement(DocumentsLibrary, { onOpen: vi.fn(), clientId: A }),
      ),
    ).not.toContain("Legacy draft");
  });
});
