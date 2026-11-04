"use client";
import type { Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { Button } from "@capiro/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Undo2,
  Redo2,
  IndentIncrease,
  IndentDecrease,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { canvasStyles } from "./canvas-content";
import styles from "./canvas-editor.module.css";

type Action = {
  label: string;
  Icon?: LucideIcon;
  active?: boolean;
  disabled: boolean;
  run: () => unknown;
};
type RunAction = (action: () => unknown) => void;

function selectionIncludesTable(editor: Editor) {
  if (editor.isActive("table")) return true;
  let table = false;
  editor.state.doc.nodesBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    (node) => {
      if (node.type.name === "table") table = true;
    },
  );
  return table;
}

function historyActions(editor: Editor, disabled: boolean): Action[] {
  return (
    [
      ["Undo", "undo", Undo2],
      ["Redo", "redo", Redo2],
    ] as const
  ).map(([label, command, Icon]) => ({
    label,
    Icon,
    disabled: disabled || !editor.can()[command](),
    run: () => editor.chain().focus()[command]().run(),
  }));
}

function markActions(editor: Editor, disabled: boolean): Action[] {
  return (
    [
      ["Bold", "bold", Bold],
      ["Italic", "italic", Italic],
      ["Underline", "underline", Underline],
      ["Strikethrough", "strike", Strikethrough],
    ] as const
  ).map(([label, mark, Icon]) => ({
    label,
    Icon,
    disabled,
    active: editor.isActive(mark),
    run: () => editor.chain().focus().toggleMark(mark).run(),
  }));
}

function quoteActions(editor: Editor, disabled: boolean): Action[] {
  const depth: number = editor.getAttributes("paragraph").quoteDepth ?? 0;
  return [-1, 1].map((change) => ({
    label: change < 0 ? "Decrease quote indent" : "Increase quote indent",
    Icon: change < 0 ? IndentDecrease : IndentIncrease,
    disabled: disabled || (change < 0 ? depth <= 0 : depth >= 8),
    run: () =>
      editor
        .chain()
        .focus()
        .updateAttributes("paragraph", {
          quoteDepth: Math.max(0, Math.min(8, depth + change)),
        })
        .run(),
  }));
}

function tableActions(
  editor: Editor,
  disabled: boolean,
  inTable: boolean,
): Action[] {
  if (inTable)
    return [
      {
        label: "Add row",
        disabled: disabled || !editor.can().addRowAfter(),
        run: () => editor.chain().focus().addRowAfter().run(),
      },
      {
        label: "Add column",
        disabled: disabled || !editor.can().addColumnAfter(),
        run: () => editor.chain().focus().addColumnAfter().run(),
      },
    ];
  return [
    {
      label: "Insert table",
      Icon: Table2,
      disabled,
      run: () =>
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 2, withHeaderRow: false })
          .run(),
    },
  ];
}

function ActionButtons({
  actions,
  run,
}: {
  actions: Action[];
  run: RunAction;
}) {
  return (
    <>
      {actions.map(({ label, Icon, active, disabled, run: action }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          className={styles.control}
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!disabled) run(action);
          }}
        >
          {Icon ? <Icon aria-hidden size={16} /> : label}
        </Button>
      ))}
    </>
  );
}

/** Only controls represented by the canonical Word format are offered. */
export function CanvasToolbar({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled: boolean;
}) {
  const inTable = selectionIncludesTable(editor);
  const formattingDisabled = disabled || inTable;
  const run: RunAction = (action) => {
    if (disabled || !editor.isEditable || editor.isDestroyed) return;
    editor.view.dispatch(closeHistory(editor.state.tr));
    action();
    editor.view.dispatch(closeHistory(editor.state.tr));
  };
  return (
    <div
      className={styles.toolbar}
      role="group"
      aria-label="Document formatting"
    >
      <ActionButtons actions={historyActions(editor, disabled)} run={run} />
      <select
        aria-label="Paragraph style"
        className={styles.select}
        value={editor.getAttributes("paragraph").style ?? "Normal"}
        disabled={formattingDisabled}
        onChange={(event) => {
          if (!formattingDisabled)
            run(() =>
              editor
                .chain()
                .focus()
                .updateAttributes("paragraph", { style: event.target.value })
                .run(),
            );
        }}
      >
        {canvasStyles.map((style) => (
          <option key={style} value={style}>
            {style === "Normal"
              ? "Text"
              : style === "List Bullet"
                ? "Bulleted list"
                : style}
          </option>
        ))}
      </select>
      <ActionButtons
        actions={[
          ...markActions(editor, formattingDisabled),
          ...quoteActions(editor, formattingDisabled),
          ...tableActions(editor, disabled, inTable),
        ]}
        run={run}
      />
    </div>
  );
}
