import { describe, expect, it } from "vitest";
import {
  getExtensionField,
  getSchema,
  type Editor,
  type ExtensionConfig,
} from "@tiptap/core";
import {
  AllSelection,
  EditorState,
  Selection,
  type Transaction,
} from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { documentExtensions } from "../src/features/modules/workspace/rich-document/extensions";

const extensions = documentExtensions();
const schema = getSchema(extensions);
const paragraph = (text?: string) =>
  schema.nodes.paragraph!.create(null, text ? schema.text(text) : undefined);
function fixture(
  nodes: readonly ProseMirrorNode[],
  editable = true,
  dryRun = false,
) {
  const doc = schema.nodes.doc!.create(null, nodes);
  const state = EditorState.create({ doc, selection: new AllSelection(doc) });
  const tr = state.tr;
  let commands = 0;
  const editor = {
    isEditable: editable,
    commands: {
      command: (
        run: (props: {
          tr: Transaction;
          dispatch: (() => void) | undefined;
        }) => boolean,
      ) => {
        commands++;
        return run({ tr, dispatch: dryRun ? undefined : () => {} });
      },
    },
  } as unknown as Editor;
  const extension = extensions.find(
    (extension) => extension.name === "documentEnd",
  )!;
  const shortcuts = getExtensionField<
    NonNullable<ExtensionConfig["addKeyboardShortcuts"]>
  >(extension, "addKeyboardShortcuts", {
    editor,
    name: extension.name,
    options: extension.options,
    storage: extension.storage,
    type: null,
  })();
  const end = shortcuts["Mod-End"];
  if (!end) throw new Error("Document-end shortcut missing");
  return {
    doc,
    state,
    tr,
    shortcuts,
    run: () => end({ editor }),
    commands: () => commands,
  };
}

describe("rich document end keyboard selection", () => {
  it.each([
    ["text", [paragraph("Keep this text")]],
    ["empty paragraph", [paragraph()]],
    [
      "trailing horizontal rule",
      [paragraph("Keep this text"), schema.nodes.horizontalRule!.create()],
    ],
    [
      "trailing table",
      [
        paragraph("Keep this text"),
        schema.nodes.table!.create(
          null,
          schema.nodes.tableRow!.create(
            null,
            schema.nodes.tableCell!.create(null, paragraph()),
          ),
        ),
      ],
    ],
  ] as const)(
    "resolves AllSelection to a valid end for %s without changing document/history",
    (_name, nodes) => {
      const f = fixture([...nodes]);
      expect(f.run()).toBe(true);
      expect(f.tr.selection.eq(Selection.atEnd(f.doc))).toBe(true);
      expect(f.tr.selection).not.toBeInstanceOf(AllSelection);
      expect(f.tr.doc.eq(f.doc)).toBe(true);
      expect(f.tr.steps).toHaveLength(0);
      expect(f.tr.docChanged).toBe(false);
      expect(f.tr.scrolledIntoView).toBe(true);
    },
  );
  it("does not handle read-only input", () => {
    const f = fixture([paragraph("Keep this text")], false);
    expect(f.run()).toBe(false);
    expect(f.commands()).toBe(0);
    expect(f.tr.selection).toBeInstanceOf(AllSelection);
  });
  it("does not mutate the transaction during a command capability check", () => {
    const f = fixture([paragraph("Keep this text")], true, true);
    expect(f.run()).toBe(true);
    expect(f.tr.selection).toBeInstanceOf(AllSelection);
    expect(f.tr.scrolledIntoView).toBe(false);
  });
  it("leaves ordinary End and Shift-Mod-End to existing keyboard behavior", () => {
    expect(Object.keys(fixture([paragraph()]).shortcuts)).toEqual(["Mod-End"]);
  });
});
