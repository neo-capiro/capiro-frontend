import {
  act,
  createElement,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import workspace from "../../src/features/modules/workspace/rich-newsletter/workspace.module.css";
import { WorkspaceScreen } from "../../src/features/modules/workspace/WorkspaceScreen";
import { createRichDocumentController } from "../../src/features/modules/workspace/rich-newsletter/document-controller";
import { createRichWriteJournal } from "../../src/features/modules/workspace/rich-newsletter/write-journal";
import { createRichNewsletterAdapter } from "../../src/shared/capiro/rich-newsletter";
import { createCapiroApi } from "../../src/shared/capiro/http";
import { richNewsletterOperations } from "../../src/shared/capiro/operations/rich-newsletter";
import {
  newsletterInput,
  newsletterSaveModel,
  type NewsletterInput,
} from "../../src/features/modules/workspace/newsletter/newsletter-atomic-save";
import {
  ordinary,
  state,
  requestId,
} from "../../tests/workspace-ordinary-save-fixtures";
import { savedNewsletterFixture } from "../../tests/saved-newsletter-fixture";
import type { NewsletterSave } from "../../src/features/modules/workspace/newsletter/newsletter-atomic-save";

const h = vi.hoisted(() => ({
  query: "view=newsletter",
  push: vi.fn(),
  fetcher: vi.fn<typeof fetch>(),
  save: vi.fn(),
  scopes: vi.fn(),
  frozen: false,
  rich: undefined as
    | ReturnType<typeof createRichDocumentController>
    | undefined,
  record: undefined as ReturnType<typeof ordinary> | undefined,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(h.query),
  useRouter: () => ({ push: h.push }),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ userId: "synthetic-user" }),
}));
vi.mock("../../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({ state: "no-selection" }),
}));
vi.mock("../../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string) => ({
    data:
      key === "workspace.draft"
        ? h.record
        : key === "me.read"
          ? {
              tenant: { id: "synthetic-tenant" },
              user: { id: "synthetic-user", clerkUserId: "synthetic-actor" },
            }
          : { items: [] },
    loading: false,
    reload: vi.fn(),
  }),
  useCapiroMutation: () => ({ run: vi.fn(), pending: false }),
}));
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/use-rich-document",
  () => ({
    useRichDocument: () => ({
      owner: h.rich!,
      state: useSyncExternalStore(
        h.rich!.subscribe,
        h.rich!.getSnapshot,
        h.rich!.getSnapshot,
      ),
    }),
  }),
);
vi.mock(
  "../../src/features/modules/workspace/ordinary-save/useOrdinaryDraftSave",
  () => ({
    useOrdinaryDraftSave: (scope: unknown) => {
      h.scopes(scope);
      const [input, setInput] = useState<NewsletterInput>(() =>
        newsletterInput(h.record!),
      );
      return {
        ready: true,
        input,
        setInput,
        currentDraft: h.record,
        frozen: h.frozen,
        canSave: !h.frozen,
        save: async () => {
          h.save(
            newsletterSaveModel.capture(state(h.record!), input, requestId),
          );
          return true;
        },
      } as NewsletterSave;
    },
  }),
);
vi.mock(
  "../../src/features/modules/workspace/ordinary-save/OrdinaryDraftSave",
  () => ({ OrdinarySaveRecovery: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/newsletter/NewsletterComments",
  () => ({ NewsletterComments: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/newsletter/NewsletterStaging",
  () => ({ NewsletterStaging: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/assets/AssetReplaceControl",
  () => ({ AssetReplaceControl: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/brand/use-brand-kit",
  () => ({ useBrandKit: () => ({ open: false }) }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/brand/BrandWorkspace",
  () => ({ BrandWorkspace: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/surveys/use-survey-drafts",
  () => ({ useSurveyDrafts: () => ({}) }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/surveys/SurveyWorkspace",
  () => ({ SurveyWorkspace: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/library/use-newsletter-library",
  () => ({ useNewsletterLibrary: () => ({ closeBrowse: vi.fn() }) }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/library/LibraryDialog",
  () => ({ LibraryNotice: () => null, LibraryDialog: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/RichDocumentActions",
  () => ({ RichDocumentActions: () => null }),
);
vi.mock(
  "../../src/features/modules/workspace/rich-newsletter/providers/AIColumnPresets",
  () => ({ AIColumnPresets: () => null }),
);
vi.mock("../../src/shared/module-ui", async (original) => ({
  ...(await original<typeof import("../../src/shared/module-ui")>()),
  Modal: ({
    open,
    children,
    footer,
  }: {
    open: boolean;
    children: ReactNode;
    footer?: ReactNode;
  }) => (open ? createElement("section", null, children, footer) : null),
}));

let root: ReturnType<typeof createRoot> | undefined;
let dispose: (() => void) | undefined;
beforeEach(async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  h.query = "view=newsletter";
  h.frozen = false;
  h.fetcher.mockReset();
  h.save.mockClear();
  h.scopes.mockClear();
  h.record = ordinary();
  h.record.product = "Newsletter";
  h.record.documents[0]!.body.newsletter = savedNewsletterFixture("weekly");
  h.rich = createRichDocumentController(
    createRichNewsletterAdapter(
      createCapiroApi(richNewsletterOperations, { fetcher: h.fetcher }),
    ),
    createRichWriteJournal(new QueryClient()),
    {
      hydrate: async () => null,
      dispatch: vi.fn(),
      reconcile: vi.fn(),
      resolve: vi.fn(),
    },
  );
  dispose = h.rich.mount();
  await vi.waitFor(() =>
    expect(h.rich!.getSnapshot().recovery.phase).toBe("ready"),
  );
});
afterEach(async () => {
  await act(async () => root?.unmount());
  dispose?.();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
async function mount() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(WorkspaceScreen)));
}
async function click(label: string) {
  const button = [
    ...document.querySelectorAll<HTMLElement>("button,[role=button]"),
  ].find(
    (node) =>
      node.getAttribute("aria-label") === label || node.textContent === label,
  );
  expect(button, label).toBeTruthy();
  await act(async () => button!.click());
}

it.each(["newsletter", "rich-newsletter"])(
  "dispatches actual view=%s to the sole workspace and full palette",
  async (view) => {
    h.query = `view=${view}`;
    await mount();
    expect(
      document.querySelectorAll('[aria-label="Newsletter workspace"]'),
    ).toHaveLength(1);
    expect(
      document.querySelector('[aria-label="Newsletter tools"]')?.textContent,
    ).toBe("BlocksSectionsStylesOptimize");
    for (const label of [
      "Columns 1",
      "Columns 1:2",
      "Desktop canvas",
      "Mobile canvas",
      "Undo",
      "Redo",
    ])
      expect(document.querySelector(`[aria-label="${label}"]`)).toBeTruthy();
    expect(
      [...document.querySelectorAll("button")]
        .filter((node) =>
          ["Image", "Heading", "Paragraph"].includes(node.textContent ?? ""),
        )
        .map((node) => node.textContent),
    ).toEqual(["Image", "Heading", "Paragraph"]);
    expect(document.body.textContent).not.toContain("Select a template");
    expect(document.body.textContent).not.toContain("Weekly policy newsletter");
    expect(
      document.querySelector('iframe[title="Newsletter editing canvas"]'),
    ).toBeTruthy();
    await click("Mobile canvas");
    expect(
      document
        .querySelector('[aria-label="Mobile canvas"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(h.fetcher).not.toHaveBeenCalled();
    expect(h.scopes).not.toHaveBeenCalled();
  },
);

it("opens a saved basic draft through actual dispatch and saves its original ID/body/CAS owner", async () => {
  h.query = `draftId=${h.record!.id}`;
  const before = structuredClone(h.record!);
  await mount();
  expect(
    document.querySelectorAll('[aria-label="Newsletter workspace"]'),
  ).toHaveLength(1);
  expect(document.body.textContent).toContain("Synthetic saved heading");
  expect(document.body.textContent).toContain(
    "WEEKLY POLICY BRIEF / 2026-10-26",
  );
  expect(document.querySelectorAll("button")).not.toContainEqual(
    expect.objectContaining({ textContent: "Edit" }),
  );
  await click("Select heading block");
  await click("Move down");
  await click("Save draft");
  const captured = h.save.mock.lastCall![0].body;
  expect(captured.expectedStateHash).toBe(state(before).stateHash);
  expect(captured.expectedClientId).toBe(null);
  expect(captured.documents[0].id).toBe(before.documents[0]!.id);
  expect(
    captured.documents[0].body.newsletter.blocks.map(
      (block: { id: string }) => block.id,
    ),
  ).toEqual(["issue-date", "intro", "heading", "cta"]);
  expect(captured.documents[0].body.unknown).toEqual({ preserved: true });
  expect(h.scopes.mock.lastCall![0]).toMatchObject({
    draftId: before.id,
    clientId: null,
  });
  expect(h.record).toEqual(before);
  expect(h.fetcher).not.toHaveBeenCalled();
});

it("contains a long saved draft in the shared scroll viewport while toolbar and inspector stay outside it", async () => {
  h.query = `draftId=${h.record!.id}`;
  h.record!.documents[0]!.body.newsletter!.blocks = Array.from(
    { length: 100 },
    (_, index) => ({
      id: `saved-block-${index}`,
      kind: "paragraph",
      text: `Saved paragraph ${index}\n${"Long stored content. ".repeat(25)}`,
    }),
  );
  await mount();
  const main = document.querySelector("main")!;
  const paper = main.querySelector("article")!;
  const viewport = paper.parentElement!;
  expect(viewport.classList.contains(workspace.canvasScroll!)).toBe(true);
  expect(viewport.parentElement).toBe(main);
  expect(
    viewport.querySelectorAll('[aria-label="Select paragraph block"]'),
  ).toHaveLength(100);
  expect(viewport.contains(document.querySelector('[aria-label="Undo"]'))).toBe(
    false,
  );
  expect(
    viewport.contains(
      document.querySelector('[aria-label="Newsletter settings"]'),
    ),
  ).toBe(false);
  // JSDOM has no layout/scroll geometry. Verify the real shared CSS contract
  // and DOM ownership, without pretending this is rendered browser acceptance.
  const css = readFileSync(
    new URL(
      "../../src/features/modules/workspace/rich-newsletter/workspace.module.css",
      import.meta.url,
    ),
    "utf8",
  );
  const rule = css.match(/\.canvasScroll\s*\{([^}]+)\}/)![1]!;
  expect(rule).toMatch(/overflow:\s*auto\s*;/);
  expect(rule).toMatch(/flex:\s*1\s*;/);
  await act(async () =>
    viewport
      .querySelectorAll<HTMLElement>(
        '[aria-label="Select paragraph block"]',
      )[99]!
      .click(),
  );
  expect(
    document.querySelector<HTMLTextAreaElement>("textarea")?.value,
  ).toContain("Saved paragraph 99");
  await click("Move up");
  await click("Save draft");
  const blocks =
    h.save.mock.lastCall![0].body.documents[0].body.newsletter.blocks;
  expect(blocks).toHaveLength(100);
  expect(blocks[98].id).toBe("saved-block-99");
  expect(blocks[99].id).toBe("saved-block-98");
  expect(h.fetcher).not.toHaveBeenCalled();
});

it("keeps a retained basic save frozen and blocks mismatched client dispatch", async () => {
  h.query = `draftId=${h.record!.id}`;
  h.frozen = true;
  await mount();
  expect(document.querySelector("fieldset")?.disabled).toBe(true);
  expect(
    [...document.querySelectorAll("button")].find(
      (node) => node.textContent === "Save draft",
    )?.disabled,
  ).toBe(true);
  await act(async () => {
    h.query += "&clientId=10000000-0000-4000-8000-000000000001";
    root!.render(createElement(WorkspaceScreen));
  });
  expect(
    document.querySelector('[aria-label="Newsletter workspace"]'),
  ).toBeNull();
  expect(document.body.textContent).toContain("Document unavailable");
  expect(h.save).not.toHaveBeenCalled();
});

it("keeps unsaved original-format edits alive while reviewing and leaving a separate rich copy", async () => {
  h.query = `draftId=${h.record!.id}`;
  await mount();
  await click("Select heading block");
  await click("Move down");
  await click("Back to blocks");
  await click("Convert to rich newsletter");
  await click("Open rich editor");
  await click("Apply converted draft");
  expect(
    h
      .rich!.getSnapshot()
      .draft.design.sections[0]!.blocks.map((block) => block.text),
  ).toContain("Synthetic saved heading");
  await click("Back to Workspace");
  await click("Discard and leave");
  expect(
    document.querySelectorAll('[aria-label="Newsletter workspace"]'),
  ).toHaveLength(1);
  expect(h.save).not.toHaveBeenCalled();
  await click("Save draft");
  expect(
    h.save.mock.lastCall![0].body.documents[0].body.newsletter.blocks.map(
      (block: { id: string }) => block.id,
    ),
  ).toEqual(["issue-date", "intro", "heading", "cta"]);
  expect(h.fetcher).not.toHaveBeenCalled();
});
