import { describe, expect, it, vi } from "vitest";
import { Schema } from "@tiptap/pm/model";
import {
  AllSelection,
  EditorState,
  NodeSelection,
  TextSelection,
  type Selection,
} from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { reconcileNativeMailCaret } from "@/features/portfolio/relationships/email/rich-mail-selection";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: { inline: true },
  },
});
const doc = schema.node("doc", null, [
  schema.node("paragraph", null, schema.text("Verified rewrite.")),
]);
function fixture(selection: Selection = new AllSelection(doc)) {
  const anchor = {} as Node;
  const native = {
    rangeCount: 1,
    isCollapsed: true,
    anchorNode: anchor,
    anchorOffset: 17,
  };
  const dispatch = vi.fn();
  const view = {
    state: EditorState.create({ schema, doc, selection }),
    hasFocus: () => true,
    dom: {
      ownerDocument: { getSelection: () => native },
      contains: (node: Node) => node === anchor,
    },
    posAtDOM: vi.fn(() => 18),
    dispatch,
  };
  const invoke = (isComposing = false) =>
    reconcileNativeMailCaret(
      view as unknown as EditorView,
      {
        isComposing,
      } as KeyboardEvent,
    );
  return { native, view, invoke, dispatch };
}

describe("native mail caret reconciliation", () => {
  it("uses the native caret without changing document or consuming the key", () => {
    const { view, invoke, dispatch } = fixture();
    expect(invoke()).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const transaction = dispatch.mock.calls[0]?.[0];
    expect(transaction.docChanged).toBe(false);
    expect(transaction.doc).toBe(doc);
    expect(transaction.selection).toBeInstanceOf(TextSelection);
    expect(transaction.selection.from).toBe(18);
    expect(transaction.selection.empty).toBe(true);
    expect(view.posAtDOM).toHaveBeenCalledWith(expect.anything(), 17);
  });

  it("leaves genuine select-all replacement and IME composition to the editor", () => {
    const selected = fixture();
    selected.native.isCollapsed = false;
    expect(selected.invoke()).toBe(false);
    expect(selected.dispatch).not.toHaveBeenCalled();
    const composing = fixture();
    expect(composing.invoke(true)).toBe(false);
    expect(composing.dispatch).not.toHaveBeenCalled();
  });

  it.each([
    TextSelection.create(doc, 2, 8),
    TextSelection.create(doc, 8),
    NodeSelection.create(doc, 0),
  ])("preserves existing text or node selection %s", (selection) => {
    const { invoke, dispatch } = fixture(selection);
    expect(invoke()).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not borrow an unfocused or external DOM selection", () => {
    const unfocused = fixture();
    unfocused.view.hasFocus = () => false;
    unfocused.invoke();
    expect(unfocused.dispatch).not.toHaveBeenCalled();
    const external = fixture();
    external.native.anchorNode = {} as Node;
    external.invoke();
    expect(external.dispatch).not.toHaveBeenCalled();
  });

  it("rejects missing ranges, unmappable nodes and non-text positions", () => {
    const missing = fixture();
    missing.native.rangeCount = 0;
    missing.invoke();
    expect(missing.dispatch).not.toHaveBeenCalled();
    const unmappable = fixture();
    unmappable.view.posAtDOM.mockImplementation(() => {
      throw new RangeError("detached native node");
    });
    expect(unmappable.invoke()).toBe(false);
    expect(unmappable.dispatch).not.toHaveBeenCalled();
    const block = fixture();
    block.view.posAtDOM.mockReturnValue(0);
    expect(block.invoke()).toBe(false);
    expect(block.dispatch).not.toHaveBeenCalled();
  });
});
