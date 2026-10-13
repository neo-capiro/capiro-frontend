"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { ActionButton } from "../../../../shared/module-ui";
import styles from "./rich-newsletter.module.css";

export function RichText({
  html,
  text,
  onChange,
}: {
  html: string;
  text: string;
  onChange: (html: string, text: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    immediatelyRender: false,
    content: html || {
      type: "doc",
      content: [
        { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
      ],
    },
    editorProps: {
      attributes: {
        "aria-label": "Block rich text",
        role: "textbox",
        "aria-multiline": "true",
        class: styles.richText!,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
  });
  // Parent Undo/Redo changes content without replacing the focused editor.
  // Ordinary input already matches, so its selection and IME session survive.
  useEffect(() => {
    if (
      !editor ||
      (html ? editor.getHTML() === html : editor.getText() === text)
    )
      return;
    editor.commands.setContent(
      html || {
        type: "doc",
        content: [
          { type: "paragraph", content: text ? [{ type: "text", text }] : [] },
        ],
      },
      { emitUpdate: false },
    );
  }, [editor, html, text]);
  if (!editor) return <p role="status">Loading text editor…</p>;
  return (
    <div>
      <div
        role="toolbar"
        aria-label="Text formatting"
        className={styles.toolbar}
      >
        <ActionButton
          aria-label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ActionButton>
        <ActionButton
          aria-label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ActionButton>
        <ActionButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullet list
        </ActionButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
