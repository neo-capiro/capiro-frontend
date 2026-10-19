"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { useEffect, useRef, useState } from "react";
import { TextInput } from "../../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsDialog,
  SettingsNotice,
} from "../components";
import styles from "../styles";

export function RichSignatureEditor({
  value,
  onChange,
  onImage,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  onImage: () => void;
  disabled?: boolean;
}) {
  const received = useRef<string | undefined>(undefined);
  const [link, setLink] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        link: {
          openOnClick: false,
          defaultProtocol: "https",
          protocols: ["mailto", "tel"],
        },
      }),
      Image.configure({ allowBase64: true }),
    ],
    content: "",
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Email signature",
        "aria-multiline": "true",
      },
      transformPastedHTML: (html) =>
        DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      received.current = html;
      onChange(html);
    },
  });
  useEffect(() => {
    if (!editor || received.current === value) return;
    editor.commands.setContent(
      DOMPurify.sanitize(value, { USE_PROFILES: { html: true } }),
      { emitUpdate: false },
    );
    received.current = value;
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  const buttons = editor
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
          label: "H1",
          name: "Heading 1",
          active: editor.isActive("heading", { level: 1 }),
          run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          label: "H2",
          name: "Heading 2",
          active: editor.isActive("heading", { level: 2 }),
          run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          label: "• List",
          name: "Bulleted list",
          active: editor.isActive("bulletList"),
          run: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          label: "1. List",
          name: "Numbered list",
          active: editor.isActive("orderedList"),
          run: () => editor.chain().focus().toggleOrderedList().run(),
        },
      ]
    : [];
  function saveLink() {
    try {
      const target = new URL(url);
      if (
        !["https:", "http:", "mailto:", "tel:"].includes(target.protocol) ||
        target.username ||
        target.password
      )
        throw new Error();
      if (editor?.state.selection.empty && !editor.isActive("link"))
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: url,
            marks: [{ type: "link", attrs: { href: target.href } }],
          })
          .run();
      else
        editor
          ?.chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: target.href })
          .run();
      setLink(false);
      setError(undefined);
    } catch {
      setError("Enter a valid website, email or phone link.");
    }
  }
  return (
    <div className={styles.richEditor}>
      <div className={styles.toolbar} aria-label="Signature formatting">
        {buttons.map((button) => (
          <button
            key={button.name}
            type="button"
            disabled={disabled}
            aria-label={button.name}
            aria-pressed={button.active}
            onMouseDown={(event) => event.preventDefault()}
            onClick={button.run}
          >
            {button.label}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => {
            setUrl(String(editor?.getAttributes("link").href ?? ""));
            setError(undefined);
            setLink(true);
          }}
        >
          Link
        </button>
        <button type="button" disabled={disabled} onClick={onImage}>
          Image
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          Clear formatting
        </button>
      </div>
      <EditorContent editor={editor} />
      {!editor && <p role="status">Loading signature editor…</p>}
      <SettingsDialog
        open={link}
        onClose={() => setLink(false)}
        title="Signature link"
        footer={
          <>
            <SettingsButton onClick={() => setLink(false)}>
              Cancel
            </SettingsButton>
            <SettingsButton
              disabled={!editor}
              onClick={() => {
                editor?.chain().focus().unsetLink().run();
                setLink(false);
              }}
            >
              Remove link
            </SettingsButton>
            <SettingsButton primary form="signature-link" type="submit">
              Apply link
            </SettingsButton>
          </>
        }
      >
        <form
          id="signature-link"
          onSubmit={(event) => {
            event.preventDefault();
            saveLink();
          }}
        >
          <SettingField label="Website, email or phone link">
            <TextInput
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              placeholder="https://example.com"
            />
          </SettingField>
          {error && (
            <SettingsNotice title="Link could not be added" error>
              {error}
            </SettingsNotice>
          )}
        </form>
      </SettingsDialog>
    </div>
  );
}
