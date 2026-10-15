"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { safeMarkdownLink } from "@capiro/ui/markdown";
import {
  editedMarkdown,
  formatMarkdownRange,
  linkMarkdownRange,
  type MarkdownAction,
  type SourceEdit,
} from "./source-edit";
export type MarkdownTextareaModel = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean | undefined;
  canEdit?: (() => boolean) | undefined;
  maxLength: number;
};
export function useMarkdownTextarea(
  {
    value,
    onChange,
    disabled,
    canEdit,
    maxLength,
    label = "Description",
  }: MarkdownTextareaModel,
  input: RefObject<HTMLTextAreaElement | null>,
) {
  const selection = useRef<{
    source: string;
    text: string;
    from: number;
    to: number;
  } | null>(null);
  const queued = useRef<{ source: string; edit: SourceEdit } | null>(null);
  const [preview, setPreview] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const editable = useCallback(
    () =>
      !disabled &&
      canEdit?.() !== false &&
      !!input.current?.isConnected &&
      !input.current.matches(":disabled"),
    [disabled, canEdit, input],
  );
  const apply = useCallback(
    (edit: SourceEdit) => {
      const node = input.current;
      if (!node || !editable()) return;
      const next = editedMarkdown(node.value, edit, maxLength);
      if (next === null) {
        setError(
          `Formatting would exceed the ${maxLength.toLocaleString()}-character limit.`,
        );
        return;
      }
      node.focus();
      node.setSelectionRange(edit.from, edit.to);
      try {
        // Native insertText keeps typing and explicit formatting in the browser Undo history.
        document.execCommand("insertText", false, edit.insert);
      } catch {
        /* Unsupported browsers retain the unchanged editable Markdown source. */
      }
      if (node.value !== next) {
        setError(
          "Formatting is unavailable in this browser. You can edit Markdown directly.",
        );
        return;
      }
      onChange(next);
      node.setSelectionRange(edit.start, edit.end);
      setError(undefined);
    },
    [editable, maxLength, onChange, input],
  );
  useEffect(() => {
    const pending = queued.current;
    if (linkOpen || !pending) return;
    const frame = requestAnimationFrame(() => {
      if (queued.current !== pending) return;
      queued.current = null;
      if (pending.source !== value) {
        setError(
          `The ${label.toLowerCase()} changed. Select its current text before adding a link.`,
        );
        return;
      }
      apply(pending.edit);
    });
    return () => cancelAnimationFrame(frame);
  }, [linkOpen, value, apply, label]);
  const format = (action: MarkdownAction) => {
    const node = input.current;
    if (!node || preview || !editable()) return;
    apply(
      formatMarkdownRange(
        node.value,
        node.selectionStart,
        node.selectionEnd,
        action,
      ),
    );
  };
  const openLink = () => {
    const node = input.current;
    if (!node || preview || !editable()) return;
    selection.current = {
      source: value,
      text: node.value,
      from: node.selectionStart,
      to: node.selectionEnd,
    };
    setUrl("");
    setError(undefined);
    setLinkOpen(true);
  };
  const insertLink = () => {
    if (!editable()) return;
    const saved = selection.current;
    const target = safeMarkdownLink(url.trim());
    if (!target) {
      setError(
        "Use an http, https, mailto, or relative link without credentials.",
      );
      return;
    }
    if (!saved || saved.source !== value) {
      setError(
        `The ${label.toLowerCase()} changed. Close this dialog and select its current text.`,
      );
      return;
    }
    const edit = linkMarkdownRange(saved.text, saved.from, saved.to, target);
    if (editedMarkdown(saved.text, edit, maxLength) === null) {
      setError(
        `The link would exceed the ${maxLength.toLocaleString()}-character limit.`,
      );
      return;
    }
    queued.current = { source: value, edit };
    setLinkOpen(false);
  };
  return {
    preview,
    setPreview,
    linkOpen,
    setLinkOpen,
    url,
    setUrl,
    error,
    format,
    openLink,
    insertLink,
    change: (next: string) => {
      if (editable()) {
        onChange(next);
        setError(undefined);
      }
    },
  };
}
