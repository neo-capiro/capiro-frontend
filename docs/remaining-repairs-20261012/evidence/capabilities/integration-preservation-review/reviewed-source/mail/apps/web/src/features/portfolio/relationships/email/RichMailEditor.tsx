"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import { EditorState } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useId, useRef } from "react";
import { type MailBody } from "./mail-body";
import { safeMailBodyHtml } from "./mail-body-html";
import styles from "./email.module.css";

/** Local composition only; transport, signature and attachment ownership stay outside. */
export function RichMailEditor({
  value,
  onChange,
  disabled,
  onAttach,
  attachDisabled,
}: {
  value: MailBody;
  onChange: (body: MailBody) => void;
  disabled: boolean;
  onAttach?: () => void;
  attachDisabled: boolean;
}) {
  const label = useId();
  const received = useRef(value.html);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        orderedList: false,
        strike: false,
      }),
    ],
    content: safeMailBodyHtml(value.html),
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-labelledby": label,
        "aria-multiline": "true",
        "aria-required": "true",
        class: styles.messageBody ?? "",
      },
      transformPastedHTML: safeMailBodyHtml,
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      if (html === received.current) return;
      received.current = html;
      onChange({ html, text: current.getText({ blockSeparator: "\n" }) });
    },
  });
  useEffect(() => {
    if (!editor || received.current === value.html) return;
    editor.commands.setContent(safeMailBodyHtml(value.html), {
      emitUpdate: false,
    });
    // External rewrites and guarded restores begin a new local editing history.
    // Only the authority-checked Meri Undo may restore the preceding draft.
    editor.view.updateState(
      EditorState.create({
        schema: editor.schema,
        doc: editor.state.doc,
        selection: editor.state.selection,
        plugins: editor.state.plugins,
      }),
    );
    received.current = editor.getHTML();
  }, [editor, value.html]);
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  const controls = editor
    ? [
        {
          label: "B",
          name: "Bold",
          active: editor.isActive("bold"),
          run: () => editor.chain().focus().toggleBold().run(),
        },
        {
          label: "I",
          name: "Italic",
          active: editor.isActive("italic"),
          run: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          label: "U",
          name: "Underline",
          active: editor.isActive("underline"),
          run: () => editor.chain().focus().toggleUnderline().run(),
        },
        {
          label: "List",
          name: "List",
          active: editor.isActive("bulletList"),
          run: () => editor.chain().focus().toggleBulletList().run(),
        },
      ]
    : [];
  return (
    <div className="stack">
      <span id={label}>Message</span>
      <div className={styles.richEditor}>
        <div
          className={styles.formatting}
          role="group"
          aria-label="Message formatting"
        >
          {controls.map((control) => (
            <button
              key={control.name}
              type="button"
              className="button ghost"
              aria-label={control.name}
              aria-pressed={control.active}
              disabled={disabled || !editor}
              onMouseDown={(event) => event.preventDefault()}
              onClick={control.run}
            >
              {control.label}
            </button>
          ))}
          {onAttach && (
            <button
              type="button"
              className={`button ghost ${styles.attachButton}`}
              disabled={attachDisabled}
              onClick={onAttach}
            >
              Attach file
            </button>
          )}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function MailBodyPreview({ html }: { html: string }) {
  return (
    <section
      aria-label="Message preview"
      className={styles.messageBody}
      dangerouslySetInnerHTML={{ __html: safeMailBodyHtml(html) }}
    />
  );
}
