"use client";
import type { Editor } from "@tiptap/core";
import { useId, useState } from "react";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../../shared/module-ui";
import { workspaceLink } from "./content";
export function DocumentLink({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  function apply() {
    if (disabled || !editor.isEditable || editor.isDestroyed) return;
    const href = workspaceLink(url);
    if (!href) {
      setError(
        "Enter a complete http, https or mailto link without credentials.",
      );
      return;
    }
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: url.trim(),
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setOpen(false);
  }
  return (
    <>
      <ActionButton
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setUrl(String(editor.getAttributes("link").href ?? ""));
          setError("");
          setOpen(true);
        }}
      >
        Link
      </ActionButton>
      <Modal
        open={open && !disabled}
        onOpenChange={setOpen}
        title="Document link"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <Field label="Website or email link" htmlFor={id}>
            <TextInput
              id={id}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </Field>
          {error && <p role="alert">{error}</p>}
          <ActionButton type="button" onClick={() => setOpen(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled || !editor.isEditable || editor.isDestroyed) return;
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              setOpen(false);
            }}
          >
            Remove link
          </ActionButton>
          <ActionButton primary type="submit" disabled={disabled}>
            Apply link
          </ActionButton>
        </form>
      </Modal>
    </>
  );
}
