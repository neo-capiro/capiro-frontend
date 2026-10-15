"use client";
import { useState } from "react";
import { Sparkle } from "lucide-react";
import ui from "../../ui/meri-ui.module.css";
import { Popover } from "./Popover";
import type { CommentView, DetailItem, RevisionSuggestion } from "./types";
import type { DocumentMode } from "./useDocumentDraft";
import shared from "./artifacts.module.css";
import styles from "./document.module.css";

/** Document overlay · blocks: searchable block menu (insertion needs the qualified editor). */
export function BlockMenu({
  items,
  onClose,
  unavailable,
}: {
  items: readonly DetailItem[];
  onClose: () => void;
  unavailable: string;
}) {
  const [query, setQuery] = useState("");
  const shown = items.filter((item) =>
    `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Popover label="Insert a block" onClose={onClose} className={styles.blocks}>
      <p className={shared.eyebrow}>Insert a block</p>
      <input
        className={styles.search}
        aria-label="Search blocks"
        placeholder="Search blocks…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul className={styles.menuList}>
        {shown.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={styles.menuItem}
              disabled
              title={unavailable}
            >
              {item.label}
              <span>{item.detail}</span>
            </button>
          </li>
        ))}
      </ul>
      {shown.length === 0 ? (
        <p className={shared.caption} role="status">
          No block matches “{query}”.
        </p>
      ) : null}
    </Popover>
  );
}

/** Document overlay · revision: Meri's suggested replacement, applied only to the local copy. */
export function RevisionCard({
  suggestion,
  canApply,
  applyUnavailable,
  onApply,
  onClose,
  unavailable,
}: {
  suggestion: RevisionSuggestion;
  canApply: boolean;
  applyUnavailable: string;
  onApply: (how: "replace" | "insert") => void;
  onClose: () => void;
  unavailable: string;
}) {
  const apply = canApply ? {} : { disabled: true, title: applyUnavailable };
  return (
    <Popover
      label="Meri suggested revision"
      onClose={onClose}
      className={`${styles.inline} ${styles.revision}`}
    >
      <h2>
        <Sparkle aria-hidden /> Meri · Suggested revision
      </h2>
      <p className={shared.body}>{suggestion.request}</p>
      <p className={styles.suggested}>{suggestion.text}</p>
      <p className={shared.body}>{suggestion.note}</p>
      <div className={ui.row}>
        <button
          type="button"
          className={ui.primary}
          onClick={() => onApply("replace")}
          {...apply}
        >
          Replace selection
        </button>
        <button
          type="button"
          className={ui.outline}
          onClick={() => onApply("insert")}
          {...apply}
        >
          Insert below
        </button>
        <span className={styles.toolSpacer} />
        <button type="button" className={ui.ghost} disabled title={unavailable}>
          Try again
        </button>
        <button type="button" className={ui.ghost} onClick={onClose}>
          Discard
        </button>
      </div>
    </Popover>
  );
}

/** Document overlay · comments: a synthetic thread; replying and resolving are not executed. */
export function CommentThread({
  comments,
  onClose,
  unavailable,
}: {
  comments: readonly CommentView[];
  onClose: () => void;
  unavailable: string;
}) {
  return (
    <Popover label="Comments" onClose={onClose} className={styles.alignEnd}>
      <p className={shared.eyebrow}>Comment · {comments.length}</p>
      {comments.map((comment) => (
        <article key={comment.id} className={styles.comment}>
          <p className={styles.author}>
            <span aria-hidden>{comment.initials}</span> {comment.author}
          </p>
          <p className={styles.blockParagraph}>{comment.text}</p>
          <p className={shared.body}>{comment.time}</p>
        </article>
      ))}
      <div className={ui.row}>
        <button
          type="button"
          className={ui.outline}
          disabled
          title={unavailable}
        >
          Reply
        </button>
        <button type="button" className={ui.ghost} disabled title={unavailable}>
          Resolve
        </button>
      </div>
    </Popover>
  );
}

const modes: readonly DocumentMode[] = ["Editing", "Suggesting"];

/** Document overlay · Editing mode: local choice between direct edits and suggestions. */
export function ModeMenu({
  value,
  onChange,
  onClose,
}: {
  value: DocumentMode;
  onChange: (mode: DocumentMode) => void;
  onClose: () => void;
}) {
  return (
    <Popover
      label="Document mode"
      onClose={onClose}
      className={styles.alignEnd}
    >
      <h2>Document mode</h2>
      <div className={styles.menuList} role="group" aria-label="Document mode">
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`${styles.menuItem} ${styles.modeItem}`}
            aria-pressed={mode === value}
            onClick={() => {
              onChange(mode);
              onClose();
            }}
          >
            {mode}
          </button>
        ))}
      </div>
    </Popover>
  );
}
