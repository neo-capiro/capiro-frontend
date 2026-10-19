"use client";
import { useId, useRef, useState } from "react";
import { ActionButton, Field, Modal, TextArea, TextInput } from "../module-ui";
import { MarkdownContent } from "./MarkdownContent";
import {
  useMarkdownTextarea,
  type MarkdownTextareaModel,
} from "./useMarkdownTextarea";
import type { MarkdownAction } from "./source-edit";
import styles from "./markdown.module.css";
const commands: { text: string; name: string; action: MarkdownAction }[] = [
  { text: "B", name: "Bold", action: "bold" },
  { text: "I", name: "Italic", action: "italic" },
  { text: "Heading", name: "Heading", action: "heading" },
  { text: "List", name: "List", action: "list" },
  { text: "Checklist", name: "Checklist", action: "checklist" },
];
export function MarkdownTextarea(
  props: MarkdownTextareaModel & {
    id: string;
    label: string;
    required?: boolean;
  },
) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const m = useMarkdownTextarea(props, inputRef);
  const urlId = useId();
  const [active, setActive] = useState(0);
  return (
    <div className={styles.editor}>
      <div
        className={styles.toolbar}
        role="toolbar"
        aria-label={`${props.label} formatting`}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ];
          const current = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (current +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          event.preventDefault();
          buttons[next]?.focus();
        }}
      >
        {commands.map((command, index) => (
          <ActionButton
            key={command.action}
            type="button"
            aria-label={command.name}
            disabled={props.disabled || m.preview}
            tabIndex={active === index ? 0 : -1}
            onFocus={() => setActive(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => m.format(command.action)}
          >
            {command.text}
          </ActionButton>
        ))}
        <ActionButton
          type="button"
          disabled={props.disabled || m.preview}
          tabIndex={active === 5 ? 0 : -1}
          onFocus={() => setActive(5)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={m.openLink}
        >
          Link
        </ActionButton>
        <ActionButton
          type="button"
          disabled={props.disabled}
          aria-pressed={m.preview}
          tabIndex={m.preview || active === 6 ? 0 : -1}
          onFocus={() => setActive(6)}
          onClick={() => {
            if (props.canEdit?.() !== false) m.setPreview(!m.preview);
          }}
        >
          Preview
        </ActionButton>
      </div>
      <TextArea
        ref={inputRef}
        id={props.id}
        value={props.value}
        maxLength={props.maxLength}
        required={props.required && !m.preview}
        disabled={props.disabled}
        hidden={m.preview}
        style={m.preview ? { display: "none" } : undefined}
        onChange={(event) => m.change(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            !event.altKey &&
            ["b", "i"].includes(event.key.toLowerCase())
          ) {
            event.preventDefault();
            m.format(event.key.toLowerCase() === "b" ? "bold" : "italic");
          }
        }}
      />
      {m.preview && (
        <div
          className={styles.preview}
          role="region"
          aria-label={`${props.label} preview`}
        >
          <MarkdownContent
            source={props.value || `No ${props.label.toLowerCase()}`}
          />
        </div>
      )}
      {!m.linkOpen && m.error && (
        <p className={styles.error} role="alert">
          {m.error}
        </p>
      )}
      <Modal
        open={m.linkOpen}
        onOpenChange={m.setLinkOpen}
        title={`Insert ${props.label.toLowerCase()} link`}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            m.insertLink();
          }}
        >
          <Field label="Link URL" htmlFor={urlId}>
            <TextInput
              id={urlId}
              value={m.url}
              disabled={props.disabled}
              onChange={(event) => m.setUrl(event.target.value)}
              required
            />
          </Field>
          {m.error && (
            <p className={styles.error} role="alert">
              {m.error}
            </p>
          )}
          <div className={styles.actions}>
            <ActionButton type="button" onClick={() => m.setLinkOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={props.disabled}>
              Insert link
            </ActionButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
