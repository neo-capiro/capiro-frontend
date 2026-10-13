import { Mark } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { workspaceLink } from "./content";

/** Native Workspace exports already recognize superscript citations. */
const Superscript = Mark.create({
  name: "superscript",
  parseHTML: () => [{ tag: "sup" }],
  renderHTML: () => ["sup", 0],
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
  ];
}
