import { beforeEach, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  SavedVersion,
  WorkspaceDraftDocument,
} from "../src/shared/capiro/operations/workspace-documents";
import {
  admitSavedVersions,
  canonicalJson,
  chronologicalPair,
  compareSavedVersions,
  safeDocumentLines,
  unknownContentExplanations,
  versionParentClient,
} from "../src/features/modules/workspace/version-history/version-history";
import { VersionHistory } from "../src/features/modules/workspace/version-history/VersionHistory";

// Synthetic identifiers only (no real tenant/client data).
const DRAFT_ID = "00000000-0000-4000-8000-0000000000d1";
const FOREIGN_DRAFT_ID = "00000000-0000-4000-8000-0000000000df";
const CLIENT_ID = "00000000-0000-4000-8000-0000000000c1";
const OTHER_CLIENT_ID = "00000000-0000-4000-8000-0000000000c2";
const V_OLD = "00000000-0000-4000-8000-0000000000a1";
const V_NEW = "00000000-0000-4000-8000-0000000000a2";
const MARKUP_PAYLOAD = "<img src=x onerror=alert(1)>";

const h = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
  tabs: [] as { label: string; onChange: (id: string) => void }[],
  buttons: [] as { children: ReactNode; onClick?: () => void }[],
  result: {
    data: [] as SavedVersion[],
    loading: false,
    error: undefined as Error | undefined,
  },
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
}));

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({ ...h.result, reload: h.reload }),
  // A read-only history must never reach for a write owner.
  useCapiroMutation: () => {
    throw new Error("version history must not use a mutation");
  },
}));

vi.mock("../src/shared/module-ui", () => ({
  ActionButton: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => {
    h.buttons.push({ children, onClick });
    return createElement("button", { type: "button", onClick }, children);
  },
  Modal: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? createElement("div", null, children) : null,
  Panel: ({ title, children }: { title?: string; children: ReactNode }) =>
    createElement(
      "section",
      null,
      title ? createElement("h2", null, title) : null,
      children,
    ),
  StatusPanel: ({
    loading,
    error,
    children,
  }: {
    loading?: boolean;
    error?: Error | string | null;
    children?: ReactNode;
  }) =>
    loading
      ? createElement("p", { role: "status" }, "Loading…")
      : error
        ? createElement(
            "p",
            { role: "alert" },
            typeof error === "string" ? error : error.message,
          )
        : createElement("div", null, children),
  Tabs: ({
    items,
    value,
    onChange,
    label,
  }: {
    items: { id: string; label: string }[];
    value: string;
    onChange: (id: string) => void;
    label?: string;
  }) => {
    h.tabs.push({ label: label ?? "", onChange });
    return createElement(
      "div",
      { role: "tablist", "aria-label": label },
      items.map((item) =>
        createElement(
          "button",
          {
            key: item.id,
            role: "tab",
            type: "button",
            "aria-selected": value === item.id,
            onClick: () => onChange(item.id),
          },
          item.label,
        ),
      ),
    );
  },
}));

const draft = {
  id: DRAFT_ID,
  clientId: CLIENT_ID,
} as unknown as WorkspaceDraftDocument;

function savedVersion(
  over: Partial<SavedVersion> & { snapshot?: unknown },
): SavedVersion {
  return {
    id: V_OLD,
    draftId: DRAFT_ID,
    label: "Manual save",
    authorId: "synthetic-user",
    authorKind: "person",
    createdAt: "2026-10-24T10:00:00.000Z",
    snapshot: {},
    ...over,
  } as unknown as SavedVersion;
}

function blockedLines(content: string) {
  return { blocks: [{ id: "b1", type: "section", content }] };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.values = [];
  h.index = 0;
  h.tabs = [];
  h.buttons = [];
  h.result = { data: [], loading: false, error: undefined };
});

// ---- pure admission ------------------------------------------------------

it("admits versions whose parent draft and client association match the document", () => {
  const rows = [
    savedVersion({ snapshot: { config: { clientId: CLIENT_ID } } }),
  ];
  const result = admitSavedVersions(rows, draft);
  expect(result.refusal).toBeUndefined();
  expect(result.versions).toHaveLength(1);
});

it("refuses a foreign parent document receipt", () => {
  const foreign = savedVersion({
    draftId: FOREIGN_DRAFT_ID,
    snapshot: { config: { clientId: CLIENT_ID } },
  });
  const result = admitSavedVersions([foreign], draft);
  expect(result.versions).toHaveLength(0);
  expect(result.refusal).toMatch(/another document/i);
});

it("refuses a mismatched or absent saved client association", () => {
  const mismatch = savedVersion({
    snapshot: { config: { clientId: OTHER_CLIENT_ID } },
  });
  expect(admitSavedVersions([mismatch], draft).refusal).toMatch(
    /client association/i,
  );
  const absent = savedVersion({ snapshot: { config: { clientId: null } } });
  expect(admitSavedVersions([absent], draft).refusal).toMatch(
    /client association/i,
  );
});

it("reads the parent client association from the saved snapshot", () => {
  expect(versionParentClient({ config: { clientId: CLIENT_ID } })).toBe(
    CLIENT_ID,
  );
  expect(versionParentClient({ config: { clientId: null } })).toBeNull();
  expect(versionParentClient({})).toBeNull();
});

// ---- pure diff -----------------------------------------------------------

it("orders two saved versions by their immutable saved time", () => {
  const older = savedVersion({ id: V_OLD, createdAt: "2026-10-24T10:00:00Z" });
  const newer = savedVersion({ id: V_NEW, createdAt: "2026-10-25T10:00:00Z" });
  expect(chronologicalPair(newer, older).map((version) => version.id)).toEqual([
    V_OLD,
    V_NEW,
  ]);
});

it("differs added, removed and renamed tabs plus title and sections", () => {
  const older = savedVersion({
    snapshot: {
      docTitle: "First",
      config: {
        clientId: CLIENT_ID,
        sectionContent: { Body: "one", Old: "x" },
      },
      documents: [
        { id: "t1", name: "Alpha", ordinal: 0, body: blockedLines("one") },
        { id: "t2", name: "Beta", ordinal: 1, body: blockedLines("two") },
      ],
    },
  });
  const newer = savedVersion({
    id: V_NEW,
    createdAt: "2026-10-25T10:00:00Z",
    snapshot: {
      docTitle: "Second",
      config: {
        clientId: CLIENT_ID,
        sectionContent: { Body: "one", Signature: "y" },
      },
      documents: [
        {
          id: "t2",
          name: "Beta renamed",
          ordinal: 0,
          body: blockedLines("two"),
        },
        { id: "t3", name: "Gamma", ordinal: 1, body: blockedLines("three") },
      ],
    },
  });
  const diff = compareSavedVersions(older, newer);
  expect(diff.titleChanged).toBe(true);
  expect(diff.tabsAdded.map((tab) => tab.name)).toEqual(["Gamma"]);
  expect(diff.tabsRemoved.map((tab) => tab.name)).toEqual(["Alpha"]);
  expect(diff.tabsRenamed).toEqual([
    { id: "t2", from: "Beta", to: "Beta renamed" },
  ]);
  expect(diff.sectionsAdded).toEqual(["Signature"]);
  expect(diff.sectionsRemoved).toEqual(["Old"]);
});

it("flags reordered tabs and changed tab bodies", () => {
  const order = (ids: string[]) =>
    ids.map((id) => ({
      id,
      name: id.toUpperCase(),
      ordinal: 0,
      body: blockedLines(id),
    }));
  const older = savedVersion({
    snapshot: {
      config: { clientId: CLIENT_ID, sectionContent: { Body: "one" } },
      documents: order(["a", "b", "c"]),
    },
  });
  const newer = savedVersion({
    id: V_NEW,
    createdAt: "2026-10-25T10:00:00Z",
    snapshot: {
      config: { clientId: CLIENT_ID, sectionContent: { Body: "two" } },
      documents: [
        { id: "b", name: "B", ordinal: 0, body: blockedLines("b") },
        { id: "a", name: "A", ordinal: 1, body: blockedLines("changed") },
        { id: "c", name: "C", ordinal: 2, body: blockedLines("c") },
      ],
    },
  });
  const diff = compareSavedVersions(older, newer);
  expect(diff.tabsReordered.map((tab) => tab.name)).toEqual(["B", "A", "C"]);
  expect(diff.bodiesChanged).toEqual(["A"]);
  expect(diff.sectionsChanged).toEqual(["Body"]);
});

it("reports no change for identical saved snapshots", () => {
  const snapshot = {
    docTitle: "Same",
    config: { clientId: CLIENT_ID, sectionContent: { Body: "one" } },
    documents: [
      { id: "t1", name: "Alpha", ordinal: 0, body: blockedLines("one") },
    ],
  };
  const diff = compareSavedVersions(
    savedVersion({ snapshot }),
    savedVersion({ id: V_NEW, snapshot }),
  );
  expect(diff).toEqual({
    titleChanged: false,
    tabsAdded: [],
    tabsRemoved: [],
    tabsReordered: [],
    tabsRenamed: [],
    bodiesChanged: [],
    sectionsAdded: [],
    sectionsRemoved: [],
    sectionsChanged: [],
  });
});

// ---- pure content projection ---------------------------------------------

it("projects only recognised document bodies to text", () => {
  expect(safeDocumentLines(blockedLines("Hello"))).toEqual(["Hello"]);
  expect(
    safeDocumentLines({
      blocks: [{ id: "b", type: "photo", title: "Caption" }],
    }),
  ).toEqual(["Caption"]);
  expect(safeDocumentLines({ blocks: [{ id: "b", type: "table" }] })).toEqual([
    "table",
  ]);
  expect(safeDocumentLines({ arbitrary: true })).toBeNull();
  expect(safeDocumentLines("free text")).toBeNull();
  expect(safeDocumentLines({ blocks: [{ id: "b" }] })).toBeNull();
});

it("explains saved JSON that history does not render", () => {
  const version = savedVersion({
    snapshot: {
      config: { clientId: CLIENT_ID, tone: "warm" },
      ask: { amount: 1 },
      documents: [
        { id: "t1", name: "Alpha", body: { arbitrary: true }, extra: 1 },
      ],
    },
  });
  const labels = unknownContentExplanations(version).map(
    (entry) => entry.label,
  );
  expect(labels).toContain("config.tone");
  expect(labels).toContain("document t1.extra");
  expect(labels).toContain("ask");
});

it("keeps canonical JSON stable across key order", () => {
  expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
});

// ---- mounted component ---------------------------------------------------

function renderHistory(seed?: unknown[]) {
  h.index = 0;
  h.values = seed ?? [];
  h.tabs = [];
  h.buttons = [];
  return renderToStaticMarkup(createElement(VersionHistory, { draft }));
}

function rerenderHistory() {
  h.index = 0;
  h.tabs = [];
  h.buttons = [];
  return renderToStaticMarkup(createElement(VersionHistory, { draft }));
}

it("shows the exact label, date, parent identity and saved content of a version", () => {
  h.result.data = [
    savedVersion({
      snapshot: {
        docTitle: "Saved title",
        config: {
          clientId: CLIENT_ID,
          sectionContent: { Body: "Section text" },
        },
        documents: [
          {
            id: "t1",
            name: "Intro",
            ordinal: 0,
            body: blockedLines("Intro body"),
          },
        ],
      },
    }),
  ];
  const markup = renderHistory([true, V_OLD, undefined]);
  expect(markup).toContain("Manual save");
  expect(markup).toContain("Parent document");
  expect(markup).toContain(DRAFT_ID);
  expect(markup).toContain(CLIENT_ID);
  expect(markup).toContain("Saved title");
  expect(markup).toContain("Section text");
  expect(markup).toContain("Intro body");
});

it("renders the selected saved version only, ignoring stale selections", () => {
  h.result.data = [
    savedVersion({
      id: V_OLD,
      snapshot: { docTitle: "Older title", config: { clientId: CLIENT_ID } },
    }),
    savedVersion({
      id: V_NEW,
      createdAt: "2026-10-25T10:00:00Z",
      snapshot: { docTitle: "Newer title", config: { clientId: CLIENT_ID } },
    }),
  ];
  expect(
    renderHistory([true, "00000000-0000-4000-8000-0000000000aa", undefined]),
  ).not.toContain("Parent document");
});

it("switches the shown saved version when a version tab is selected", () => {
  h.result.data = [
    savedVersion({
      id: V_OLD,
      snapshot: { docTitle: "Older title", config: { clientId: CLIENT_ID } },
    }),
    savedVersion({
      id: V_NEW,
      createdAt: "2026-10-25T10:00:00Z",
      snapshot: { docTitle: "Newer title", config: { clientId: CLIENT_ID } },
    }),
  ];
  renderHistory([true, V_OLD, undefined]);
  const versions = h.tabs.find((tab) => tab.label === "Saved versions")!;
  versions.onChange(V_NEW);
  expect(rerenderHistory()).toContain("Newer title");
});

it("refuses display for a foreign parent document", () => {
  h.result.data = [
    savedVersion({
      draftId: FOREIGN_DRAFT_ID,
      snapshot: { docTitle: "Foreign" },
    }),
  ];
  const markup = renderHistory([true, V_OLD, undefined]);
  expect(markup).toContain('role="alert"');
  expect(markup).toContain("another document");
  expect(markup).not.toContain("Parent document");
});

it("clears detail and compare state on a read error", () => {
  h.result.data = [
    savedVersion({
      snapshot: { docTitle: "Saved", config: { clientId: CLIENT_ID } },
    }),
    savedVersion({
      id: V_NEW,
      createdAt: "2026-10-25T10:00:00Z",
      snapshot: { docTitle: "Newer", config: { clientId: CLIENT_ID } },
    }),
  ];
  h.result.error = new Error(
    "You do not have permission to access this document",
  );
  const markup = renderHistory([true, V_OLD, V_NEW]);
  expect(markup).toContain("You do not have permission");
  expect(markup).not.toContain("Parent document");
  expect(markup).not.toContain("Comparing");
});

it("compares the two selected saved versions oldest to newest", () => {
  h.result.data = [
    savedVersion({
      id: V_OLD,
      snapshot: {
        docTitle: "First",
        config: { clientId: CLIENT_ID, sectionContent: { Body: "one" } },
        documents: [
          { id: "t1", name: "Alpha", ordinal: 0, body: blockedLines("one") },
        ],
      },
    }),
    savedVersion({
      id: V_NEW,
      createdAt: "2026-10-25T10:00:00Z",
      snapshot: {
        docTitle: "Second",
        config: { clientId: CLIENT_ID, sectionContent: { Body: "one" } },
        documents: [
          { id: "t2", name: "Beta", ordinal: 0, body: blockedLines("two") },
        ],
      },
    }),
  ];
  const markup = renderHistory([true, V_OLD, V_NEW]);
  expect(markup).toContain("Comparing");
  expect(markup).toContain("Tabs added: Beta");
  expect(markup).toContain("Tabs removed: Alpha");
});

it("refuses to compare a saved version with itself", () => {
  h.result.data = [
    savedVersion({
      snapshot: { docTitle: "Saved", config: { clientId: CLIENT_ID } },
    }),
  ];
  const markup = renderHistory([true, V_OLD, V_OLD]);
  expect(markup).toContain("Choose two different saved versions");
});

it("explains unrecognised saved content and never renders raw markup", () => {
  h.result.data = [
    savedVersion({
      snapshot: {
        docTitle: "Saved",
        config: { clientId: CLIENT_ID, tone: "warm" },
        documents: [
          {
            id: "t1",
            name: "Intro",
            ordinal: 0,
            body: blockedLines(MARKUP_PAYLOAD),
          },
          { id: "t2", name: "Raw", ordinal: 1, body: { arbitrary: true } },
        ],
      },
    }),
  ];
  const markup = renderHistory([true, V_OLD, undefined]);
  expect(markup).toContain("Unrecognised saved content");
  expect(markup).toContain("config.tone");
  expect(markup).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(markup).not.toContain(MARKUP_PAYLOAD);
});
