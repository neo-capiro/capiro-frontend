import { expect, it, vi } from "vitest";
import {
  createNewsletterBlock,
  createNewsletterSection,
} from "@capiro/shared/newsletter";
import { newRichDraft } from "../src/features/modules/workspace/rich-newsletter/draft";
import { changeStructure } from "../src/features/modules/workspace/rich-newsletter/content/structure";
import {
  NEWSLETTER_DRAG_TYPE,
  readBlockDrop,
  startBlockDrag,
} from "../src/features/modules/workspace/rich-newsletter/content/structure-drag";
import { StructureDropTarget } from "../src/features/modules/workspace/rich-newsletter/content/StructureDropTarget";

function transfer(raw = "") {
  return {
    effectAllowed: "",
    types: [NEWSLETTER_DRAG_TYPE],
    setData: vi.fn((_type: string, data: string) => {
      raw = data;
    }),
    getData: vi.fn(() => raw),
  };
}
it("drags palette columns into a precise nested position and moves content without losing fields", () => {
  const draft = newRichDraft();
  const paragraph = createNewsletterBlock("paragraph", { text: "Retained" });
  const columns = createNewsletterBlock("columns", {
    columns: [[paragraph], []],
  });
  draft.design.sections = [createNewsletterSection("Body", [columns])];
  const target = {
    sectionId: draft.design.sections[0]!.id,
    blockId: columns.id,
    column: 0,
    beforeId: paragraph.id,
  };
  const data = transfer();
  startBlockDrag(data as unknown as DataTransfer, {
    type: "add",
    kind: "columns",
    ratio: "1:3",
  });
  expect(data.effectAllowed).toBe("copy");
  const action = readBlockDrop(data, target)!;
  const added = changeStructure(draft.design, action).design;
  expect(
    added.sections[0]!.blocks[0]!.columns[0]!.map((block) => block.kind),
  ).toEqual(["columns", "paragraph"]);
  expect(added.sections[0]!.blocks[0]!.columns[0]![0]!.ratio).toBe("1:3");
  startBlockDrag(data as unknown as DataTransfer, {
    type: "move",
    id: paragraph.id,
  });
  const moved = changeStructure(
    added,
    readBlockDrop(data, { sectionId: target.sectionId, beforeId: columns.id })!,
  ).design;
  expect(moved.sections[0]!.blocks[0]).toEqual(paragraph);
  expect(draft.design.sections[0]!.blocks[0]!.columns[0]).toEqual([paragraph]);
});

it.each([
  "not json",
  "null",
  '{"type":"add","kind":"survey"}',
  '{"type":"add","kind":"columns","ratio":"9"}',
  '{"type":"add","kind":"unknown"}',
  '{"type":"move","id":1}',
])("ignores unsupported drag data %s", (raw) => {
  expect(readBlockDrop(transfer(raw), { sectionId: "synthetic" })).toBeNull();
});

it("retains cycle and stale-position refusal without changing input", () => {
  const draft = newRichDraft();
  const block = createNewsletterBlock("columns");
  draft.design.sections = [createNewsletterSection("Body", [block])];
  const before = structuredClone(draft.design);
  const data = transfer(JSON.stringify({ type: "move", id: block.id }));
  expect(() =>
    changeStructure(
      draft.design,
      readBlockDrop(data, {
        sectionId: before.sections[0]!.id,
        blockId: block.id,
        column: 0,
      })!,
    ),
  ).toThrow("inside itself");
  const adding = transfer(JSON.stringify({ type: "add", kind: "paragraph" }));
  expect(() =>
    changeStructure(
      draft.design,
      readBlockDrop(adding, {
        sectionId: before.sections[0]!.id,
        beforeId: "missing",
      })!,
    ),
  ).toThrow();
  expect(draft.design).toEqual(before);
});

it("dispatches only supported local drops and stops nested bubbling", () => {
  const change = vi.fn();
  const target = { sectionId: "synthetic" };
  const view = StructureDropTarget({ target, label: "Drop here", change });
  const event = {
    dataTransfer: transfer('{"type":"add","kind":"footer"}'),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
  view.props.onDrop(event);
  expect(change).toHaveBeenCalledWith({
    type: "addBlock",
    kind: "footer",
    target,
  });
  expect(event.preventDefault).toHaveBeenCalledOnce();
  expect(event.stopPropagation).toHaveBeenCalledOnce();
  change.mockClear();
  event.dataTransfer.types = ["text/uri-list"];
  view.props.onDrop(event);
  expect(change).not.toHaveBeenCalled();
});
