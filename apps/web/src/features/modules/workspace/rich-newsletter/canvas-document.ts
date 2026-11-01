import {
  NEWSLETTER_BLOCK_LABELS,
  type NewsletterBlock,
  type NewsletterDesign,
} from "@capiro/shared/newsletter";
import type { BlockContainer, StructureAction } from "./content/structure";
import {
  NEWSLETTER_DRAG_TYPE,
  readBlockDrop,
  startBlockDrag,
} from "./content/structure-drag";

export type CanvasActions = {
  select: (id: string) => void;
  editSection: (id: string) => void;
  change: (action: StructureAction) => void;
  remove: (id: string) => void;
};

const canvasCss = `
body{background:transparent!important;padding:28px 2px 8px;overflow-wrap:anywhere}
[data-nl-block]{position:relative;outline:1px solid transparent;cursor:pointer;min-height:12px}
[data-nl-block]:hover{outline-color:#88c3c8}
[data-nl-block][aria-selected=true],[data-nl-block]:focus-visible{outline:2px solid #007c89}
[data-nl-section]{position:relative;min-height:20px}
.nl-edit-tools{position:absolute;right:0;top:-28px;z-index:8;display:flex;align-items:center;height:28px;background:#007c89;color:white;font:11px Arial;opacity:0;pointer-events:none}
.nl-edit-tools span{padding:0 10px}
.nl-edit-tools button,.nl-edit-section{border:0;border-radius:0;background:#007c89;color:white;font:12px Arial;padding:6px;cursor:pointer}
[data-nl-block]:hover>.nl-edit-tools,[data-nl-block]:focus-within>.nl-edit-tools,[data-nl-block][aria-selected=true]>.nl-edit-tools{opacity:1;pointer-events:auto}
.nl-edit-section{position:absolute;left:0;top:-20px;z-index:4;opacity:0}
[data-nl-section]:hover>.nl-edit-section,.nl-edit-section:focus-visible{opacity:1}
.nl-edit-drop{height:3px;min-width:10px}
.nl-edit-drop[data-over=true]{background:#42c8d7;height:8px}
button:focus-visible{outline:2px solid #241c15;outline-offset:2px}
`;

function dropLine(
  doc: Document,
  target: BlockContainer,
  change: CanvasActions["change"],
) {
  const line = doc.createElement("div");
  line.className = "nl-edit-drop";
  line.setAttribute("aria-hidden", "true");
  line.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes(NEWSLETTER_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    line.dataset.over = "true";
  });
  line.addEventListener("dragleave", () => delete line.dataset.over);
  line.addEventListener("drop", (event) => {
    delete line.dataset.over;
    if (!event.dataTransfer) return;
    const action = readBlockDrop(event.dataTransfer, target);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    change(action);
  });
  return line;
}

function bindBlock(
  doc: Document,
  block: NewsletterBlock,
  target: BlockContainer,
  actions: CanvasActions,
) {
  const element = doc.getElementById(block.id);
  if (!element) return;
  element.dataset.nlBlock = block.id;
  element.tabIndex = 0;
  element.setAttribute("role", "treeitem");
  element.setAttribute(
    "aria-label",
    `Edit ${NEWSLETTER_BLOCK_LABELS[block.kind]}${block.text ? `: ${block.text.slice(0, 60)}` : ""}`,
  );
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    actions.select(block.id);
  });
  element.addEventListener("keydown", (event) => {
    if (event.target !== element) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      actions.select(block.id);
    }
    const items = Array.from(
      doc.querySelectorAll<HTMLElement>("[data-nl-block]"),
    );
    const index = items.indexOf(element);
    const next =
      event.key === "ArrowDown"
        ? items[index + 1]
        : event.key === "ArrowUp"
          ? items[index - 1]
          : event.key === "ArrowRight"
            ? element.querySelector<HTMLElement>("[data-nl-block]")
            : event.key === "ArrowLeft"
              ? element.parentElement?.closest<HTMLElement>("[data-nl-block]")
              : null;
    if (next) {
      event.preventDefault();
      event.stopPropagation();
      next.focus();
      actions.select(next.dataset.nlBlock!);
    }
  });
  element.before(
    dropLine(doc, { ...target, beforeId: block.id }, actions.change),
  );
  const bar = doc.createElement("div");
  bar.className = "nl-edit-tools";
  const label = doc.createElement("span");
  label.textContent = NEWSLETTER_BLOCK_LABELS[block.kind];
  bar.append(label);
  const controls: [string, string, () => void][] = [
    [
      "Move up",
      "↑",
      () => actions.change({ type: "block", id: block.id, action: "up" }),
    ],
    [
      "Move down",
      "↓",
      () => actions.change({ type: "block", id: block.id, action: "down" }),
    ],
    [
      "Duplicate",
      "⧉",
      () =>
        actions.change({ type: "block", id: block.id, action: "duplicate" }),
    ],
    ["Delete", "×", () => actions.remove(block.id)],
  ];
  for (const [name, glyph, run] of controls) {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = glyph;
    button.setAttribute(
      "aria-label",
      `${name} ${NEWSLETTER_BLOCK_LABELS[block.kind]}`,
    );
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      run();
    });
    bar.append(button);
  }
  label.draggable = true;
  label.title = "Drag to move";
  label.addEventListener("dragstart", (event) => {
    event.stopPropagation();
    if (event.dataTransfer)
      startBlockDrag(event.dataTransfer, { type: "move", id: block.id });
  });
  element.prepend(bar);
  if (block.kind === "columns") {
    const cells = element.querySelectorAll(":scope > table > tbody > tr > td");
    block.columns.forEach((column, index) => {
      const next = {
        sectionId: target.sectionId,
        blockId: block.id,
        column: index,
      };
      column.forEach((child) => bindBlock(doc, child, next, actions));
      cells[index]?.append(dropLine(doc, next, actions.change));
    });
  }
}

/** Parent-owned controls only. The email document cannot execute scripts or navigate. */
export function bindCanvasDocument(
  doc: Document,
  design: NewsletterDesign,
  actions: CanvasActions,
) {
  const style = doc.createElement("style");
  style.textContent = canvasCss;
  doc.head.append(style);
  doc.body.setAttribute("role", "tree");
  doc.body.setAttribute("aria-label", "Newsletter content");
  design.sections.forEach((section) => {
    const element = doc.getElementById(section.id);
    if (!element) return;
    element.dataset.nlSection = section.id;
    element.setAttribute("role", "group");
    element.setAttribute("aria-label", section.name || "Untitled section");
    const label = doc.createElement("button");
    label.type = "button";
    label.className = "nl-edit-section";
    label.textContent = section.name || "Untitled section";
    label.setAttribute("aria-label", `Edit section ${section.name}`);
    label.addEventListener("click", () => actions.editSection(section.id));
    element.prepend(label);
    section.blocks.forEach((block) =>
      bindBlock(doc, block, { sectionId: section.id }, actions),
    );
    element.append(dropLine(doc, { sectionId: section.id }, actions.change));
  });
}

export function markCanvasSelection(doc: Document, selectedId: string | null) {
  doc.querySelectorAll<HTMLElement>("[data-nl-block]").forEach((element) => {
    element.setAttribute(
      "aria-selected",
      String(element.dataset.nlBlock === selectedId),
    );
  });
}
