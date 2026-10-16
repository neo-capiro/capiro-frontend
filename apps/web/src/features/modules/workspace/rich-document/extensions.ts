import { Extension, Mark } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { workspaceLink } from "./content";

/** Native Workspace exports already recognize superscript citations. */
const Superscript = Mark.create({
  name: "superscript",
  parseHTML: () => [{ tag: "sup" }],
  renderHTML: () => ["sup", 0],
});
// Native document-end movement can leave ProseMirror AllSelection active.
// Resolve it in editor state before a subsequent insertion replaces that range.
const DocumentEnd = Extension.create({
  name: "documentEnd",
  addKeyboardShortcuts() {
    return {
      "Mod-End": () => {
        if (!this.editor.isEditable) return false;
        return this.editor.commands.command(({ tr, dispatch }) => {
          if (dispatch)
            tr.setSelection(Selection.atEnd(tr.doc)).scrollIntoView();
          return true;
        });
      },
    };
  },
});
export function documentExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        isAllowedUri: (url) => workspaceLink(url) !== null,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
          class: null,
        },
      },
    }),
    TableKit.configure({ table: { resizable: false } }),
    Superscript,
    DocumentEnd,
  ];
}
