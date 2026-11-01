// Run with a DOM test setup; no browser, network, provider or production data.
import { describe, expect, it, vi } from "vitest";
import {
  createNewsletterBlock,
  createNewsletterSection,
} from "@capiro/shared/newsletter";
import { newRichDraft } from "../../src/features/modules/workspace/rich-newsletter/draft";
import {
  renderDraft,
  sanitizePreviewDocument,
} from "../../src/features/modules/workspace/rich-newsletter/RichPreview";
import {
  bindCanvasDocument,
  markCanvasSelection,
} from "../../src/features/modules/workspace/rich-newsletter/canvas-document";
import { NEWSLETTER_DRAG_TYPE } from "../../src/features/modules/workspace/rich-newsletter/content/structure-drag";

function fixture() {
  const draft = newRichDraft();
  const child = createNewsletterBlock("paragraph", {
    text: "Synthetic nested text",
  });
  const columns = createNewsletterBlock("columns", {
    ratio: "2",
    columns: [[child], []],
  });
  const image = createNewsletterBlock("image", {
    imageUrl: "https://outside.test/private.png",
    alt: "Synthetic external",
  });
  const section = createNewsletterSection("Synthetic section", [
    columns,
    image,
  ]);
  draft.design.sections = [section];
  const doc = new DOMParser().parseFromString(
    sanitizePreviewDocument(renderDraft(draft, true)),
    "text/html",
  );
  const actions = {
    select: vi.fn(),
    editSection: vi.fn(),
    change: vi.fn(),
    remove: vi.fn(),
  };
  bindCanvasDocument(doc, draft.design, actions);
  return { draft, doc, actions, child, columns, image, section };
}

describe("canonical selectable newsletter canvas", () => {
  it("keeps script/form/navigation/external-image protections and rejects spoofed selection ids", () => {
    const draft = newRichDraft();
    const safe = createNewsletterBlock("paragraph", { text: "Expected block" });
    const hostile = createNewsletterBlock("code", {
      html: `<div id="${safe.id}" data-nl-block="fake"><script>alert(1)</script><form action="https://outside.test"><input name="q"></form><iframe src="https://outside.test"></iframe><a href="javascript:alert(1)">link</a><img src="https://outside.test/tracker" onerror="alert(1)"><style>@import url(https://outside.test/a.css);</style></div>`,
    });
    draft.design.sections = [
      createNewsletterSection("Synthetic", [hostile, safe]),
    ];
    const doc = new DOMParser().parseFromString(
      sanitizePreviewDocument(renderDraft(draft, true)),
      "text/html",
    );
    expect(doc.querySelectorAll(`[id="${safe.id}"]`)).toHaveLength(1);
    expect(
      doc.querySelector(
        "script,iframe,form,input,[href],[onerror],[data-nl-block]",
      ),
    ).toBeNull();
    expect(doc.querySelector("img[src^='https://outside.test']")).toBeNull();
    const csp = doc
      .querySelector('meta[http-equiv="Content-Security-Policy"]')!
      .getAttribute("content")!;
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("form-action 'none'; base-uri 'none'");
    expect(csp).not.toContain("https://outside.test");
  });

  it("selects the innermost block by click and keyboard without selecting its parent", () => {
    const { doc, child, columns, actions } = fixture();
    doc
      .getElementById(child.id)!
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    expect(actions.select.mock.calls).toEqual([[child.id]]);
    doc.getElementById(child.id)!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(actions.select).toHaveBeenLastCalledWith(child.id);
    doc.getElementById(child.id)!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(actions.select).toHaveBeenLastCalledWith(columns.id);
    markCanvasSelection(doc, child.id);
    expect(doc.getElementById(child.id)!.getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(doc.getElementById(columns.id)!.getAttribute("aria-selected")).toBe(
      "false",
    );
    markCanvasSelection(doc, null);
    expect(doc.querySelector('[aria-selected="true"]')).toBeNull();
  });

  it("routes drops into nested columns or before the correct sibling through the existing reducer actions", () => {
    const { doc, child, columns, section, actions } = fixture();
    const payload = { type: "add", kind: "heading" };
    const drop = (target: Element) => {
      const event = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: {
          getData: (type: string) =>
            type === NEWSLETTER_DRAG_TYPE ? JSON.stringify(payload) : "",
        },
      });
      target.dispatchEvent(event);
    };
    drop(doc.getElementById(child.id)!.previousElementSibling!);
    expect(actions.change).toHaveBeenLastCalledWith({
      type: "addBlock",
      kind: "heading",
      target: {
        sectionId: section.id,
        blockId: columns.id,
        column: 0,
        beforeId: child.id,
      },
    });
    const emptyColumn = doc
      .getElementById(columns.id)!
      .querySelectorAll(":scope > table > tbody > tr > td")[1]!;
    drop(emptyColumn.querySelector(".nl-edit-drop")!);
    expect(actions.change).toHaveBeenLastCalledWith({
      type: "addBlock",
      kind: "heading",
      target: { sectionId: section.id, blockId: columns.id, column: 1 },
    });
  });

  it("exposes section editing and block movement/duplication/deletion without writing", () => {
    const { doc, child, section, actions } = fixture();
    doc.querySelector<HTMLButtonElement>(".nl-edit-section")!.click();
    expect(actions.editSection).toHaveBeenCalledWith(section.id);
    const block = doc.getElementById(child.id)!;
    block
      .querySelector<HTMLButtonElement>('[aria-label="Duplicate Paragraph"]')!
      .click();
    expect(actions.change).toHaveBeenCalledWith({
      type: "block",
      id: child.id,
      action: "duplicate",
    });
    block
      .querySelector<HTMLButtonElement>('[aria-label="Delete Paragraph"]')!
      .click();
    expect(actions.remove).toHaveBeenCalledWith(child.id);
  });
});
