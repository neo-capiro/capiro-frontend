import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { WorkspaceDraftDocument } from "../src/shared/capiro/operations/workspace-documents";
import {
  ORDINARY_ALL_PART,
  ORDINARY_MAIN_PART,
  ordinaryExportTabs,
  ordinaryPartOptions,
  ordinaryPartRefusal,
  ordinaryScopeRefusal,
  runOrdinaryExport,
} from "../src/features/modules/workspace/ordinary-export/ordinary-export";
import { OrdinaryDraftExport } from "../src/features/modules/workspace/ordinary-export/OrdinaryDraftExport";
import { WorkspaceDraft } from "../src/features/modules/workspace/WorkspaceDraft";

// Synthetic identifiers only (no real tenant/client data).
const DRAFT_ID = "60000000-0000-4000-8000-000000000001";
const TAB_A = "70000000-0000-4000-8000-0000000000a1";
const TAB_B = "70000000-0000-4000-8000-0000000000b1";
const FOREIGN_TAB = "70000000-0000-4000-8000-0000000099ff";
const CLIENT_ID = "10000000-0000-4000-8000-000000000001";

const urlCreate = vi.hoisted(() => vi.fn(() => "blob:synthetic"));
const urlRevoke = vi.hoisted(() => vi.fn());
const h = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
  api: {
    request: vi.fn(),
    download: vi.fn(),
    upload: vi.fn(),
  },
  current: undefined as WorkspaceDraftDocument | undefined,
  anchors: [] as { href: string; download: string; click: () => void }[],
  buttons: [] as {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }[],
  selects: [] as {
    value: string;
    onValueChange: (value: string) => void;
    options: readonly { value: string; label: string }[];
  }[],
  editors: [] as {
    name: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
  }[],
  inputs: [] as { value: string; onChange: (event: unknown) => void }[],
  previews: [] as {
    title: string;
    names: string[];
    sections: Record<string, string>;
  }[],
  effects: [] as (() => undefined | (() => void))[],
  update: vi.fn(),
  snapshot: vi.fn(),
  reload: vi.fn(),
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
          typeof next === "function"
            ? (next as (value: unknown) => unknown)(h.values[index])
            : next;
      },
    ];
  },
  // Capture effects instead of scheduling them so a test can replay React's
  // documented StrictMode setup -> cleanup -> setup ordering against the real
  // component refs. Static rendering never runs effects on its own.
  useEffect: (effect: () => undefined | (() => void)) => {
    h.effects.push(effect);
  },
}));

vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => h.api,
}));

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => ({
    data: key === "workspace.draft" ? h.current : {},
    loading: false,
    reload: h.reload,
  }),
  useCapiroMutation: (key: string) => ({
    run: key === "workspace.draft.update" ? h.update : h.snapshot,
    pending: false,
  }),
}));

vi.mock("../src/features/modules/workspace/DraftClientAssociation", () => ({
  DraftClientAssociation: () => null,
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
vi.mock("../src/features/modules/workspace/brief-copy/CopiedTabs", () => ({
  CopiedTabs: () => null,
}));
vi.mock(
  "../src/features/modules/workspace/version-history/VersionHistory",
  () => ({ VersionHistory: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/rich-document/DocumentPreview",
  () => ({
    DocumentPreview: (props: (typeof h.previews)[number]) => {
      h.previews.push(props);
      return createElement("div", null, "Preview draft");
    },
  }),
);
vi.mock(
  "../src/features/modules/workspace/rich-document/SectionPreview",
  () => ({ SectionPreview: () => null }),
);
vi.mock(
  "../src/features/modules/workspace/rich-document/SectionEditor",
  () => ({
    SectionEditor: (props: (typeof h.editors)[number]) => {
      h.editors.push(props);
      return null;
    },
  }),
);

vi.mock("../src/shared/module-ui", () => {
  const children = ({ children }: { children?: ReactNode }) =>
    createElement("div", null, children);
  return {
    ActionButton: ({
      children,
      onClick,
      disabled,
    }: (typeof h.buttons)[number]) => {
      h.buttons.push({ children, onClick, disabled });
      return createElement(
        "button",
        { type: "button", onClick, disabled },
        children,
      );
    },
    SelectInput: (props: (typeof h.selects)[number]) => {
      h.selects.push(props);
      return createElement(
        "div",
        null,
        props.options.map((option) =>
          createElement("span", { key: option.value }, option.label),
        ),
      );
    },
    Field: children,
    Panel: children,
    StatusPanel: children,
    Modal: () => null,
    Tabs: () => null,
    TextInput: (props: (typeof h.inputs)[number]) => {
      h.inputs.push(props);
      return null;
    },
  };
});

function draftWith(
  over: Partial<WorkspaceDraftDocument> = {},
): WorkspaceDraftDocument {
  return {
    id: DRAFT_ID,
    prospectId: null,
    clientId: CLIENT_ID,
    client: "Synthetic client",
    docTitle: "Synthetic ordinary document",
    product: null,
    industry: null,
    status: "draft",
    updatedAt: "2026-10-25T10:00:00Z",
    createdAt: "2026-10-24T10:00:00Z",
    config: { sections: ["Body"], sectionContent: { Body: "Saved body" } },
    documents: [
      {
        id: TAB_A,
        draftId: DRAFT_ID,
        name: "Main document",
        ordinal: 0,
        body: { blocks: [] },
        createdAt: "2026-10-24T10:00:00Z",
        updatedAt: "2026-10-24T10:00:00Z",
      },
      {
        id: TAB_B,
        draftId: DRAFT_ID,
        name: "Cover letter",
        ordinal: 1,
        body: { blocks: [] },
        createdAt: "2026-10-24T10:00:00Z",
        updatedAt: "2026-10-24T10:00:00Z",
      },
    ],
    ...over,
  } as unknown as WorkspaceDraftDocument;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.values = [];
  h.index = 0;
  h.anchors = [];
  h.buttons = [];
  h.selects = [];
  h.editors = [];
  h.inputs = [];
  h.previews = [];
  h.effects = [];
  h.current = draftWith();
  h.api.request.mockImplementation(async () => h.current);
  h.api.download.mockResolvedValue({
    blob: new Blob(["synthetic"]),
    filename: "workspace-document.pdf",
  });
  Object.assign(URL, {
    createObjectURL: urlCreate,
    revokeObjectURL: urlRevoke,
  });
  vi.stubGlobal("document", {
    createElement: () => {
      const anchor = { href: "", download: "", click: vi.fn() };
      h.anchors.push(anchor);
      return anchor;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

// ---- pure: tabs and parts --------------------------------------------------

it("offers only packet add-on tabs, by exact id, excluding the primary row", () => {
  const draft = draftWith({
    documents: [
      { id: TAB_A, name: "Overview", ordinal: 0 },
      { id: TAB_B, name: "Overview", ordinal: 1 },
    ],
  } as unknown as Partial<WorkspaceDraftDocument>);
  const tabs = ordinaryExportTabs(draft);
  expect(tabs).toEqual([{ id: TAB_B, label: "Overview" }]);
  expect(ordinaryPartOptions(tabs).map((option) => option.value)).toEqual([
    ORDINARY_ALL_PART,
    ORDINARY_MAIN_PART,
    TAB_B,
  ]);
});

it("orders tabs by ordinal before excluding the primary row", () => {
  const draft = draftWith({
    documents: [
      { id: TAB_B, name: "Cover letter", ordinal: 1 },
      { id: TAB_A, name: "Primary", ordinal: 0 },
    ],
  } as unknown as Partial<WorkspaceDraftDocument>);
  expect(ordinaryExportTabs(draft)).toEqual([
    { id: TAB_B, label: "Cover letter" },
  ]);
});

it("falls back to a plain label for an unnamed add-on tab", () => {
  expect(
    ordinaryExportTabs(
      draftWith({
        documents: [
          { id: TAB_A, name: "Primary", ordinal: 0 },
          { id: TAB_B, name: "  ", ordinal: 1 },
        ],
      } as never),
    ),
  ).toEqual([{ id: TAB_B, label: "Untitled tab" }]);
});

// ---- pure: refusals --------------------------------------------------------

it("refuses a moved, held, foreign or prospect receipt before export", () => {
  const expected = { id: DRAFT_ID, clientId: CLIENT_ID };
  expect(ordinaryScopeRefusal(draftWith(), expected)).toBe("");
  expect(
    ordinaryScopeRefusal(draftWith({ id: FOREIGN_TAB }), expected),
  ).toMatch(/does not match this link/i);
  expect(
    ordinaryScopeRefusal(
      draftWith({ clientId: "90000000-0000-4000-8000-000000000009" }),
      expected,
    ),
  ).toMatch(/client scope/i);
  expect(
    ordinaryScopeRefusal(draftWith({ clientAssociation: "held" }), expected),
  ).toMatch(/client scope/i);
  expect(
    ordinaryScopeRefusal(
      draftWith({ prospectId: "30000000-0000-4000-8000-000000000001" }),
      expected,
    ),
  ).toMatch(/ordinary documents only/i);
});

it("refuses a part that is not all, main or an exact add-on tab id", () => {
  const tabs = ordinaryExportTabs(draftWith());
  expect(ordinaryPartRefusal(ORDINARY_ALL_PART, tabs)).toBe("");
  expect(ordinaryPartRefusal(ORDINARY_MAIN_PART, tabs)).toBe("");
  expect(ordinaryPartRefusal(TAB_B, tabs)).toBe("");
  expect(ordinaryPartRefusal(TAB_B.toUpperCase(), tabs)).toBe("");
  expect(ordinaryPartRefusal(TAB_A, tabs)).toMatch(
    /not part of this document/i,
  );
  expect(ordinaryPartRefusal(FOREIGN_TAB, tabs)).toMatch(
    /not part of this document/i,
  );
  expect(ordinaryPartRefusal("", tabs)).toMatch(/not part of this document/i);
});

// ---- pure: export orchestration -------------------------------------------

function exportHarness(over: Partial<{ part: string }> = {}) {
  const save = vi.fn();
  const download = vi.fn(async () => ({
    blob: new Blob(["synthetic"]),
    filename: "workspace-document.pdf",
  }));
  const readCurrent = vi.fn(async () => h.current!);
  return {
    save,
    download,
    readCurrent,
    run: () =>
      runOrdinaryExport({
        request: {
          format: "pdf" as const,
          part: over.part ?? ORDINARY_ALL_PART,
        },
        expected: { id: DRAFT_ID, clientId: CLIENT_ID },
        readCurrent,
        download,
        save,
      }),
  };
}

it("re-authorizes then exports the exact selected part once", async () => {
  const harness = exportHarness({ part: TAB_B });
  await expect(harness.run()).resolves.toBe("");
  expect(harness.readCurrent).toHaveBeenCalledTimes(1);
  expect(harness.download).toHaveBeenCalledWith({
    format: "pdf",
    part: TAB_B,
  });
  expect(harness.save).toHaveBeenCalledTimes(1);
});

it("refuses a moved client receipt without downloading or saving", async () => {
  h.current = draftWith({ clientId: "90000000-0000-4000-8000-000000000009" });
  const harness = exportHarness();
  await expect(harness.run()).resolves.toMatch(/client scope/i);
  expect(harness.download).not.toHaveBeenCalled();
  expect(harness.save).not.toHaveBeenCalled();
});

it("refuses a tab the current authorized draft does not contain", async () => {
  const harness = exportHarness({ part: FOREIGN_TAB });
  await expect(harness.run()).resolves.toMatch(/not part of this document/i);
  expect(harness.download).not.toHaveBeenCalled();
  expect(harness.save).not.toHaveBeenCalled();
});

it("reports a denied or unsupported export without saving", async () => {
  const harness = exportHarness();
  harness.download.mockRejectedValue(
    new Error("You do not have permission to export this document."),
  );
  await expect(harness.run()).resolves.toMatch(/do not have permission/i);
  expect(harness.save).not.toHaveBeenCalled();
  harness.download.mockRejectedValue(new Error("Unexpected export response."));
  await expect(harness.run()).resolves.toBe("Unexpected export response.");
  expect(harness.save).not.toHaveBeenCalled();
});

it("stays silent and never saves when the export is superseded", async () => {
  const harness = exportHarness();
  const abort = new Error("The request was cancelled.");
  abort.name = "AbortError";
  harness.download.mockRejectedValue(abort);
  await expect(harness.run()).resolves.toBe("");
  expect(harness.save).not.toHaveBeenCalled();
});

// ---- component: export control --------------------------------------------

function renderExport() {
  h.index = 0;
  h.buttons = [];
  h.selects = [];
  h.effects = [];
  return renderToStaticMarkup(
    createElement(OrdinaryDraftExport, {
      draft: draftWith(),
      disabled: false,
    }),
  );
}

it("renders the tab choice, both formats and the saved-content warning", () => {
  const markup = renderExport();
  expect(markup).toContain("All documents");
  expect(markup).toContain("Main sections only");
  expect(markup).toContain("Cover letter");
  // The primary row is not offered as an exact-id part.
  expect(markup).not.toContain("Main document");
  expect(markup).toContain("Export saved PDF");
  expect(markup).toContain("Export saved DOCX");
  expect(markup).toContain("server-saved content");
  expect(markup).not.toContain("saved version");
});

it("downloads through the existing binary client and releases the object URL", async () => {
  renderExport();
  const pdf = h.buttons.find(
    (button) => button.children === "Export saved PDF",
  )!;
  pdf.onClick!();
  await vi.waitFor(() => expect(h.anchors).toHaveLength(1));
  expect(h.api.request).toHaveBeenCalledWith("workspace.draft", {
    params: { id: DRAFT_ID },
  });
  expect(h.api.download).toHaveBeenCalledWith("workspace.draft.pdf", {
    params: { draftId: DRAFT_ID },
    query: { part: ORDINARY_ALL_PART },
  });
  expect(h.anchors[0]!.download).toBe("workspace-document.pdf");
  expect(h.anchors[0]!.click).toHaveBeenCalled();
  await vi.waitFor(
    () => expect(urlRevoke).toHaveBeenCalledWith("blob:synthetic"),
    { timeout: 3000 },
  );
});

it("keeps a valid export working across a StrictMode setup -> cleanup -> setup replay", async () => {
  renderExport();
  // React replays the effect this way (development StrictMode). The component's
  // real ref and its real save closure are exercised; only the scheduling is
  // replayed by the test.
  const effect = h.effects.at(-1)!;
  const cleanup = effect() as () => void;
  cleanup();
  effect();
  const pdf = h.buttons.find(
    (button) => button.children === "Export saved PDF",
  )!;
  pdf.onClick!();
  await vi.waitFor(() => expect(h.anchors).toHaveLength(1));
  expect(h.api.download).toHaveBeenCalledWith("workspace.draft.pdf", {
    params: { draftId: DRAFT_ID },
    query: { part: ORDINARY_ALL_PART },
  });
  // The completion must also clear pending rather than bail out early.
  expect(h.values[1]).toBe(false);
});

it("sends the explicitly chosen tab id as the export part", async () => {
  renderExport();
  h.selects[0]!.onValueChange(TAB_B);
  renderExportWithValues();
  const docx = h.buttons.find(
    (button) => button.children === "Export saved DOCX",
  )!;
  docx.onClick!();
  await vi.waitFor(() => expect(h.api.download).toHaveBeenCalled());
  expect(h.api.download).toHaveBeenCalledWith("workspace.draft.docx", {
    params: { draftId: DRAFT_ID },
    query: { part: TAB_B },
  });
});

function renderExportWithValues() {
  h.index = 0;
  h.buttons = [];
  h.selects = [];
  h.effects = [];
  return renderToStaticMarkup(
    createElement(OrdinaryDraftExport, {
      draft: draftWith(),
      disabled: false,
    }),
  );
}

it("ignores a duplicate in-flight export click", async () => {
  let release!: (file: { blob: Blob; filename: string }) => void;
  h.api.download.mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  renderExport();
  const pdf = h.buttons.find(
    (button) => button.children === "Export saved PDF",
  )!;
  pdf.onClick!();
  pdf.onClick!();
  release({ blob: new Blob(["x"]), filename: "workspace-document.pdf" });
  await vi.waitFor(() => expect(h.anchors).toHaveLength(1));
  expect(h.api.download).toHaveBeenCalledTimes(1);
  expect(h.api.request).toHaveBeenCalledTimes(1);
});

it("never calls a write on preview or export", async () => {
  renderExport();
  const pdf = h.buttons.find(
    (button) => button.children === "Export saved PDF",
  )!;
  pdf.onClick!();
  await vi.waitFor(() => expect(h.anchors).toHaveLength(1));
  for (const call of h.api.request.mock.calls)
    expect(call[0]).toBe("workspace.draft");
  for (const call of h.api.download.mock.calls)
    expect(["workspace.draft.pdf", "workspace.draft.docx"]).toContain(call[0]);
  expect(h.api.upload).not.toHaveBeenCalled();
  expect(h.update).not.toHaveBeenCalled();
  expect(h.snapshot).not.toHaveBeenCalled();
});

it("surfaces a refused export and never downloads on failure", async () => {
  h.api.download.mockRejectedValue(
    new Error("You do not have permission to export this document."),
  );
  renderExport();
  const pdf = h.buttons.find(
    (button) => button.children === "Export saved PDF",
  )!;
  pdf.onClick!();
  await vi.waitFor(() => expect(h.values[2]).toBeTruthy());
  const markup = renderExportWithValues();
  expect(markup).toContain("do not have permission");
  expect(h.anchors).toHaveLength(0);
});

it("does not download when a superseded export is cancelled", async () => {
  const abort = new Error("The request was cancelled.");
  abort.name = "AbortError";
  h.api.download.mockRejectedValue(abort);
  renderExport();
  const pdf = h.buttons.find(
    (button) => button.children === "Export saved PDF",
  )!;
  pdf.onClick!();
  await vi.waitFor(() => expect(h.api.download).toHaveBeenCalled());
  expect(h.anchors).toHaveLength(0);
  expect(h.values[2] ?? "").toBe("");
});

// ---- ordinary host seam (WorkspaceDraft) -----------------------------------

function redrawDraft() {
  h.index = 0;
  h.editors = [];
  h.inputs = [];
  h.buttons = [];
  h.previews = [];
  return renderToStaticMarkup(
    createElement(WorkspaceDraft, {
      id: DRAFT_ID,
      expectedClientId: CLIENT_ID,
      onClose: vi.fn(),
    }),
  );
}

it("uses the shared section editor for ordinary sections without truncating content", () => {
  h.current = draftWith();
  redrawDraft();
  expect(h.editors[0]!.name).toBe("Body");
  expect(h.editors[0]!.value).toBe("Saved body");
  const rich = `<p>${"x".repeat(4200)}</p>`;
  h.editors[0]!.onChange(rich);
  redrawDraft();
  expect(h.editors[0]!.value).toBe(rich);
  expect(h.update).not.toHaveBeenCalled();
  expect(h.snapshot).not.toHaveBeenCalled();
});

it("keeps an unsupported ordinary body inert and read-only", () => {
  h.current = draftWith({
    config: { sections: [], sectionContent: {} },
    documents: [
      {
        id: TAB_A,
        name: "Main document",
        ordinal: 0,
        body: { blocks: [{ id: "b1", type: "table", unknown: "<img>" }] },
      },
    ],
  } as never);
  const markup = redrawDraft();
  expect(h.editors).toHaveLength(0);
  expect(markup).toContain("<article>");
  expect(markup).toContain("table");
  expect(markup).not.toContain("Format text");
  expect(markup).not.toContain("<img>");
  // The preview must refuse rather than present a title-only empty document.
  expect(h.previews).toHaveLength(0);
  expect(markup).toContain("Preview unavailable");
});

it("qualifies a mixed ordinary projection instead of hiding unsupported content", () => {
  h.current = draftWith({
    config: { sections: ["Body"], sectionContent: { Body: "Saved body" } },
    documents: [
      {
        id: TAB_A,
        name: "Primary",
        ordinal: 0,
        body: { blocks: [{ id: "b1", type: "photo" }] },
      },
    ],
  } as never);
  const markup = redrawDraft();
  expect(h.previews).toHaveLength(1);
  expect(markup).toContain("Preview draft");
  expect(markup).toContain("shows only the supported sections");
  expect(markup).not.toContain("Preview unavailable");
});

it("qualifies a supported-section ordinary preview when opaque body content is not shown", () => {
  // Reviewer counterexample: supported config.sections/sectionContent plus
  // passthrough content that is not inside body.blocks (richDocument) and
  // therefore not projected by the section preview.
  h.current = draftWith({
    config: { sections: ["Body"], sectionContent: { Body: "Saved body" } },
    documents: [
      {
        id: TAB_A,
        name: "Primary",
        ordinal: 0,
        body: {
          blocks: [],
          richDocument: { type: "table", rows: [["Unshown stored content"]] },
        },
      },
    ],
  } as never);
  const markup = redrawDraft();
  expect(h.previews).toHaveLength(1);
  expect(markup).toContain("shows only the supported sections");
});

it("qualifies the ordinary supported projection conservatively", () => {
  // The qualification cannot be inferred from the block list alone - passthrough
  // body/config content may exist outside it - so it is stated whenever the
  // preview shows the supported sections only.
  h.current = draftWith({
    config: { sections: ["Body"], sectionContent: { Body: "Saved body" } },
    documents: [
      {
        id: TAB_A,
        name: "Primary",
        ordinal: 0,
        body: { blocks: [{ id: "b1", type: "section", title: "Body" }] },
      },
    ],
  } as never);
  const markup = redrawDraft();
  expect(h.previews).toHaveLength(1);
  expect(markup).toContain("shows only the supported sections");
  expect(markup).not.toContain("Preview unavailable");
});

it("offers ordinary saved export without any writer on render", () => {
  h.current = draftWith();
  const markup = redrawDraft();
  expect(markup).toContain("Export saved PDF");
  expect(h.api.upload).not.toHaveBeenCalled();
  expect(h.update).not.toHaveBeenCalled();
  expect(h.snapshot).not.toHaveBeenCalled();
});
