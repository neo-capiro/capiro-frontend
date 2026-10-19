import { AllSelection, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** Native End can move the caret before the selectionchange observer runs. */
export function reconcileNativeMailCaret(
  view: EditorView,
  event: KeyboardEvent,
): false {
  if (
    event.isComposing ||
    !view.hasFocus() ||
    !(view.state.selection instanceof AllSelection)
  )
    return false;
  const native = view.dom.ownerDocument.getSelection();
  if (
    !native ||
    native.rangeCount !== 1 ||
    !native.isCollapsed ||
    !native.anchorNode ||
    !view.dom.contains(native.anchorNode)
  )
    return false;
  let position: number;
  try {
    position = view.posAtDOM(native.anchorNode, native.anchorOffset);
  } catch {
    return false;
  }
  if (!view.state.doc.resolve(position).parent.inlineContent) return false;
  // Selection-only: preserve content and native history, then process the key.
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, position)),
  );
  return false;
}
