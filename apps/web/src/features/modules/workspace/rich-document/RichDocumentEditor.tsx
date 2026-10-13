"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import { EditorState } from "@tiptap/pm/state";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActionButton, Modal } from "../../../../shared/module-ui";
import { documentExtensions } from "./extensions";
import { projectSection } from "./html";
import { DocumentToolbar } from "./DocumentToolbar";
import { SectionPreview } from "./SectionPreview";
import styles from "./rich-document.module.css";

const subscribe = () => () => {};
type EditorProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
};
export function RichDocumentEditor(props: EditorProps) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? (
    <MountedDocumentEditor {...props} />
  ) : (
    <p role="status">Loading document editor…</p>
  );
}

function MountedDocumentEditor({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const received = useRef(value);
  const [preview, setPreview] = useState(false);
  const [reviewed, setReviewed] = useState<string>();
  const projection = projectSection(value);
  const reviewRequired = projection.requiresReview && reviewed !== value;
  const frozen = disabled || reviewRequired;
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: documentExtensions(),
    content: projection.html,
    editable: !frozen,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": `${name} content`,
        "aria-multiline": "true",
        class: styles.document ?? "",
      },
      transformPastedHTML: (html) => projectSection(html).html,
    },
    onUpdate: ({ editor: current }) => {
      if (frozen) return;
      const html = projectSection(current.getHTML()).html;
      received.current = html;
      onChange(html);
    },
  });
  useEffect(() => {
    editor?.setEditable(!frozen, false);
  }, [editor, frozen]);
  useEffect(() => {
    if (!editor || received.current === value) return;
    editor.commands.setContent(projectSection(value).html, {
      emitUpdate: false,
    });
    // External document replacement must not leave another draft in local Undo.
    editor.view.updateState(
      EditorState.create({
        schema: editor.schema,
        doc: editor.state.doc,
        selection: editor.state.selection,
        plugins: editor.state.plugins,
      }),
    );
    received.current = value;
  }, [editor, value]);
  return (
    <div className={styles.editor}>
      {reviewRequired && (
        <div role="status" className={styles.notice}>
          <p>
            This section contains formatting or markup that this editor cannot
            preserve. The saved source is unchanged. Review it before replacing
            it with the supported text, links, lists and tables shown below.
          </p>
          <details>
            <summary>Original section source</summary>
            <pre className={styles.source}>{value}</pre>
          </details>
          <ActionButton
            disabled={disabled}
            onClick={() => {
              if (!disabled) setReviewed(value);
            }}
          >
            Edit supported content
          </ActionButton>
        </div>
      )}
      {editor ? (
        <DocumentToolbar
          editor={editor}
          disabled={frozen}
          name={name}
          onPreview={() => setPreview(true)}
        />
      ) : (
        <p role="status">Loading document editor…</p>
      )}
      <EditorContent editor={editor} />
      <Modal open={preview} onOpenChange={setPreview} title={`${name} preview`}>
        <p>
          Preview of your local section. Saved PDF and DOCX exports may simplify
          formatting.
        </p>
        <SectionPreview value={value} />
      </Modal>
    </div>
  );
}
