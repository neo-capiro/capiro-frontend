"use client";
import { Extension, Node } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { EditorState, Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import type { DocumentContentRequest } from "@capiro/meri-contracts/document-application";
import { useEffect, useRef } from "react";
import {
  canvasContentSupport,
  canvasDocument,
  canvasDocumentRequest,
  canvasAcceptsTransaction,
  canvasSourceText,
  canvasStyles,
  canvasTextChange,
  type CanvasWordRequest,
} from "./canvas-content";
import { CanvasToolbar } from "./CanvasToolbar";
import styles from "./canvas-editor.module.css";

export type CanvasEditorProps = {
  request: DocumentContentRequest;
  disabled: boolean;
  onChange: (request: DocumentContentRequest) => void;
};

const paragraphAttributes =
  (fallback: (typeof canvasStyles)[number]) => (element: HTMLElement) => {
    const style = element.dataset.canvasStyle;
    const quoteDepth = Number(element.dataset.quoteDepth ?? 0);
    return {
      style: canvasStyles.find((value) => value === style) ?? fallback,
      quoteDepth:
        Number.isInteger(quoteDepth) && quoteDepth >= 0 && quoteDepth <= 8
          ? quoteDepth
          : 0,
    };
  };

/** The public Word format has paragraph styles, not nested HTML headings/lists. */
const CanvasParagraph = Node.create({
  name: "paragraph",
  group: "block",
  content: "inline*",
  addAttributes() {
    return {
      sourceIndex: { default: null, rendered: false, parseHTML: () => null },
      style: { default: "Normal", rendered: false, parseHTML: () => null },
      quoteDepth: { default: 0, rendered: false, parseHTML: () => null },
    };
  },
  parseHTML: () => [
    { tag: "p", getAttrs: paragraphAttributes("Normal") },
    { tag: "h1", getAttrs: paragraphAttributes("Title") },
    { tag: "h2", getAttrs: paragraphAttributes("Heading 1") },
    { tag: "h3", getAttrs: paragraphAttributes("Heading 2") },
    { tag: "li", getAttrs: paragraphAttributes("List Bullet") },
  ],
  renderHTML({ node }) {
    const tag =
      node.attrs.style === "Title"
        ? "h1"
        : node.attrs.style === "Heading 1"
          ? "h2"
          : node.attrs.style === "Heading 2"
            ? "h3"
            : "p";
    return [
      tag,
      {
        "data-canvas-style": node.attrs.style,
        "data-quote-depth": node.attrs.quoteDepth,
        style: `--canvas-quote-depth: ${node.attrs.quoteDepth}`,
      },
      0,
    ];
  },
});

/** The transaction guard covers keyboard shortcuts, paste and table commands as well as the toolbar. */
export function canvasExtensions() {
  return [
    StarterKit.configure({
      paragraph: false,
      heading: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      link: false,
      trailingNode: false,
    }),
    CanvasParagraph,
    TableKit.configure({ table: { resizable: false } }),
    Extension.create({
      name: "canvasSourceIdentity",
      addGlobalAttributes: () => [
        {
          types: ["table"],
          attributes: {
            sourceIndex: {
              default: null,
              rendered: false,
              parseHTML: () => null,
            },
          },
        },
      ],
      addProseMirrorPlugins: () => [
        new Plugin({
          filterTransaction: canvasAcceptsTransaction,
        }),
      ],
    }),
  ];
}

function WordEditor({
  request,
  disabled,
  onChange,
}: CanvasEditorProps & { request: CanvasWordRequest }) {
  // Source indices belong to the document loaded into this editor, not to each controlled echo.
  const source = useRef(request);
  const received = useRef(JSON.stringify(request));
  const latest = useRef({ disabled, onChange });
  useEffect(() => {
    latest.current = { disabled, onChange };
  }, [disabled, onChange]);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: canvasExtensions(),
    content: canvasDocument(request),
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Document content",
        "aria-multiline": "true",
        "aria-readonly": String(disabled),
        class: styles.document ?? "",
      },
    },
    onUpdate: ({ editor: current }) => {
      if (latest.current.disabled) return;
      const next = canvasDocumentRequest(source.current, current.getJSON());
      received.current = JSON.stringify(next);
      latest.current.onChange(next);
    },
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  useEffect(() => {
    if (!editor || received.current === JSON.stringify(request)) return;
    source.current = request;
    received.current = JSON.stringify(request);
    editor.commands.setContent(canvasDocument(request), { emitUpdate: false });
    // A replacement from Meri or a different saved version must never undo into the prior source.
    editor.view.updateState(
      EditorState.create({
        schema: editor.schema,
        doc: editor.state.doc,
        selection: editor.state.selection,
        plugins: editor.state.plugins,
      }),
    );
  }, [editor, request]);
  return (
    <div className={styles.editor}>
      {editor ? (
        <CanvasToolbar editor={editor} disabled={disabled} />
      ) : (
        <p role="status">Loading document editor…</p>
      )}
      <div className={styles.page}>
        <EditorContent editor={editor} />
      </div>
      <p className={styles.hint}>
        Tables keep plain text. Images and charts stay in the original document.
      </p>
    </div>
  );
}

/** Presentation only. The parent owns current access, saving, conflicts and Meri's response. */
export function CanvasEditor(props: CanvasEditorProps) {
  const support = canvasContentSupport(props.request);
  if (!support.editable)
    return (
      <section className={styles.readonly} aria-label="Read-only document">
        <p role="status">{support.reason}</p>
        <pre>{canvasSourceText(props.request)}</pre>
      </section>
    );
  if (props.request.format === "docx")
    return <WordEditor {...props} request={props.request} />;
  if (props.request.format !== "txt") return null;
  const request = props.request;
  return (
    <textarea
      className={styles.textarea}
      aria-label="Document content"
      value={request.content.text}
      readOnly={props.disabled}
      spellCheck
      onChange={(event) => {
        if (!props.disabled)
          props.onChange({
            ...request,
            content: {
              ...request.content,
              text: canvasTextChange(request.content.text, event.target.value),
            },
          });
      }}
    />
  );
}
