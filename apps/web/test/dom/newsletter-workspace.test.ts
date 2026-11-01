import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { WorkspacePreview } from "../../src/features/modules/workspace/rich-newsletter/WorkspacePreview";
import { WorkspacePalette } from "../../src/features/modules/workspace/rich-newsletter/WorkspacePalette";
import { newRichDraft } from "../../src/features/modules/workspace/rich-newsletter/draft";
import type { NewsletterPreview } from "@capiro/shared/newsletter";

vi.mock("../../src/shared/module-ui", () => ({
  Modal: ({ children }: { children: ReactNode }) =>
    createElement("section", null, children),
}));
let root: ReturnType<typeof createRoot> | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
});
async function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(node));
}
async function click(label: string) {
  const button = Array.from(document.querySelectorAll("button")).find(
    (item) => item.textContent === label,
  )!;
  expect(button).toBeTruthy();
  await act(async () => button.click());
}

it("previews the exact saved HTML/plain text and keeps device changes local", async () => {
  const draft = newRichDraft();
  draft.config.subject = "Unsaved synthetic subject";
  const saved: NewsletterPreview = {
    documentId: "a1111111-1111-4111-8111-111111111111",
    revision: 7,
    renderHash: "0".repeat(64),
    hashFormat: "newsletter-render-json-v1",
    html: "<p>Saved synthetic content</p>",
    plainText: "Saved synthetic plain text",
    checks: [],
  };
  const stage = vi.fn();
  const checkHtml = vi.fn();
  await mount(
    createElement(WorkspacePreview, {
      draft,
      saved,
      initialMode: "Desktop",
      close: vi.fn(),
      stage,
      checkHtml,
    }),
  );
  expect(document.querySelector("iframe")!.getAttribute("sandbox")).toBe("");
  expect(document.querySelector("iframe")!.srcdoc).toContain(
    "Saved synthetic content",
  );
  expect(document.body.textContent).not.toContain("Unsaved synthetic subject");
  await click("Mobile");
  expect(document.querySelector("iframe")!.style.width).toBe("375px");
  await click("Plain text");
  expect(document.querySelector("pre")!.textContent).toBe(
    "Saved synthetic plain text",
  );
  await click("Inbox");
  expect(stage).not.toHaveBeenCalled();
  expect(checkHtml).not.toHaveBeenCalled();
  await click("Review saved HTML checks");
  expect(checkHtml).toHaveBeenCalledOnce();
  expect(stage).not.toHaveBeenCalled();
});

it("routes palette clicks to canonical local block actions with every column ratio", async () => {
  const draft = newRichDraft();
  const change = vi.fn();
  await mount(
    createElement(WorkspacePalette, { design: draft.design, change, ai: null }),
  );
  expect(
    Array.from(document.querySelectorAll("button")).some(
      (button) => button.textContent === "Survey",
    ),
  ).toBe(false);
  await click("Footer");
  expect(change).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: "addBlock", kind: "footer" }),
  );
  const ratio = document.querySelector<HTMLButtonElement>(
    '[aria-label="Columns 1:2"]',
  )!;
  await act(async () => ratio.click());
  expect(change).toHaveBeenLastCalledWith(
    expect.objectContaining({
      type: "addBlock",
      kind: "columns",
      ratio: "1:2",
    }),
  );
  expect(document.querySelectorAll('[aria-label^="Columns "]')).toHaveLength(8);
});
