"use client";
import type { Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { useId } from "react";
import { ActionButton } from "../../../../shared/module-ui";
import { DocumentLink } from "./DocumentLink";
import styles from "./rich-document.module.css";
export function DocumentToolbar({
  editor,
  disabled,
  onPreview,
  name,
}: {
  editor: Editor;
  disabled: boolean;
  onPreview: () => void;
  name: string;
}) {
  const id = useId();
  const run = (action: () => unknown) => {
    if (disabled || !editor.isEditable || editor.isDestroyed) return;
    // Each explicit toolbar operation is one Undo step; typing keeps upstream grouping.
    editor.view.dispatch(closeHistory(editor.state.tr));
    action();
    editor.view.dispatch(closeHistory(editor.state.tr));
  };
  const marks = [
    {
      name: "Bold",
      text: "B",
      mark: "bold",
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      name: "Italic",
      text: "I",
      mark: "italic",
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      name: "Underline",
      text: "U",
      mark: "underline",
      action: () => editor.chain().focus().toggleUnderline().run(),
    },
  ];
  return (
    <div
      className={styles.toolbar}
      role="group"
      aria-label={`${name} formatting`}
    >
      <ActionButton
        aria-label="Undo"
        disabled={disabled || !editor.can().undo()}
        onClick={() => run(() => editor.chain().focus().undo().run())}
      >
        ↶
      </ActionButton>
      <ActionButton
        aria-label="Redo"
        disabled={disabled || !editor.can().redo()}
        onClick={() => run(() => editor.chain().focus().redo().run())}
      >
        ↷
      </ActionButton>
      <label className={styles.hiddenLabel} htmlFor={id}>
        Text format
      </label>
      <select
        id={id}
        disabled={disabled}
        value={
          editor.isActive("heading", { level: 2 })
            ? "h2"
            : editor.isActive("heading", { level: 3 })
              ? "h3"
              : "p"
        }
        onChange={(event) =>
          run(() => {
            if (event.target.value === "p")
              editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .setHeading({ level: event.target.value === "h2" ? 2 : 3 })
                .run();
          })
        }
      >
        <option value="p">Text</option>
        <option value="h2">Heading</option>
        <option value="h3">Subheading</option>
      </select>
      {marks.map((mark) => (
        <ActionButton
          key={mark.name}
          aria-label={mark.name}
          aria-pressed={editor.isActive(mark.mark)}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(mark.action)}
        >
          {mark.text}
        </ActionButton>
      ))}
      <DocumentLink editor={editor} disabled={disabled} />
      <details className={styles.menu}>
        <summary>Lists</summary>
        <div className={styles.menuItems}>
          <ActionButton
            disabled={disabled}
            aria-pressed={editor.isActive("bulletList")}
            onClick={() =>
              run(() => editor.chain().focus().toggleBulletList().run())
            }
          >
            Bulleted list
          </ActionButton>
          <ActionButton
            disabled={disabled}
            aria-pressed={editor.isActive("orderedList")}
            onClick={() =>
              run(() => editor.chain().focus().toggleOrderedList().run())
            }
          >
            Numbered list
          </ActionButton>
        </div>
      </details>
      <details className={styles.menu}>
        <summary>Table</summary>
        <div className={styles.menuItems}>
          <ActionButton
            disabled={disabled}
            onClick={() =>
              run(() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
                  .run(),
              )
            }
          >
            Insert table
          </ActionButton>
          <ActionButton
            disabled={disabled || !editor.can().addRowAfter()}
            onClick={() =>
              run(() => editor.chain().focus().addRowAfter().run())
            }
          >
            Add row
          </ActionButton>
          <ActionButton
            disabled={disabled || !editor.can().addColumnAfter()}
            onClick={() =>
              run(() => editor.chain().focus().addColumnAfter().run())
            }
          >
            Add column
          </ActionButton>
          <ActionButton
            disabled={disabled || !editor.can().deleteTable()}
            onClick={() =>
              run(() => editor.chain().focus().deleteTable().run())
            }
          >
            Delete table
          </ActionButton>
        </div>
      </details>
      <details className={styles.menu}>
        <summary>+ Insert</summary>
        <div className={styles.menuItems}>
          <ActionButton
            disabled={disabled}
            onClick={() =>
              run(() => editor.chain().focus().toggleBlockquote().run())
            }
          >
            Quote
          </ActionButton>
          <ActionButton
            disabled={disabled}
            onClick={() =>
              run(() => editor.chain().focus().setHorizontalRule().run())
            }
          >
            Divider
          </ActionButton>
        </div>
      </details>
      <ActionButton onClick={onPreview}>Preview</ActionButton>
    </div>
  );
}
