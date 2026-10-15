"use client";
import { useId, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, MessageSquare, Sparkle } from "lucide-react";
import { TextField } from "./TextField";
import ui from "../../ui/meri-ui.module.css";
import styles from "./conversation.module.css";

export type PaletteItem = {
  id: string;
  kind: "conversation" | "artifact" | "routine" | "command";
  title: string;
  detail: string;
  /** Registered destination; absent when the target is not available here. */
  href?: string;
};
export type PaletteView = {
  initialQuery: string;
  items: readonly PaletteItem[];
};

const icons = {
  conversation: <MessageSquare />,
  artifact: <FileText />,
  routine: <Clock />,
  command: <Sparkle />,
} as const;
const shortcuts = [
  ["⌘K / Ctrl+K", "Open or close search"],
  ["↑ ↓", "Move between results"],
  ["Enter", "Open the highlighted result"],
  ["Esc", "Close search"],
] as const;

/** Commands always list; other results match any query word in their title or detail. */
const matches = (item: PaletteItem, query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${item.title} ${item.detail}`.toLowerCase();
  return (
    item.kind === "command" ||
    !words.length ||
    words.some((word) => text.includes(word))
  );
};

/** Combobox and listbox with arrow-key highlight; Enter opens registered destinations only. */
export function CommandPalette({ view }: { view: PaletteView }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(view.initialQuery);
  const [active, setActive] = useState(0);
  const [message, setMessage] = useState("");
  const results = view.items.filter((item) => matches(item, query));
  const current = results[Math.min(active, results.length - 1)];
  const open = (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.href) router.push(item.href);
    else
      setMessage(
        `${item.title} is not available in this disconnected fixture.`,
      );
  };
  const move = (event: KeyboardEvent) => {
    const step =
      event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (event.key === "Enter") open(current);
    if (!step && event.key !== "Enter") return;
    event.preventDefault();
    if (step && results.length)
      setActive((index) => (index + step + results.length) % results.length);
  };
  return (
    <>
      <TextField
        label="Search"
        role="combobox"
        aria-expanded
        aria-controls={listId}
        aria-autocomplete="list"
        autoFocus
        aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setActive(0);
          setMessage("");
        }}
        onKeyDown={move}
      />
      <PaletteResults
        listId={listId}
        results={results}
        current={current}
        onHover={(item) => setActive(results.indexOf(item))}
        onOpen={open}
      />
      <p className="sr-only" role="status">
        {message || `${results.length} results`}
      </p>
      <ShortcutHelp />
    </>
  );
}

function PaletteResults({
  listId,
  results,
  current,
  onHover,
  onOpen,
}: {
  listId: string;
  results: readonly PaletteItem[];
  current: PaletteItem | undefined;
  onHover: (item: PaletteItem) => void;
  onOpen: (item: PaletteItem) => void;
}) {
  return (
    <ul
      id={listId}
      role="listbox"
      aria-label="Results"
      className={styles.results}
    >
      {results.map((item) => (
        <li
          key={item.id}
          id={`${listId}-${item.id}`}
          role="option"
          aria-selected={item === current}
          aria-disabled={!item.href}
          title={
            item.href ? undefined : "Not available in this disconnected fixture"
          }
          className={styles.result}
          onMouseMove={() => onHover(item)}
          onClick={() => onOpen(item)}
        >
          <span className={styles.rowIcon} aria-hidden>
            {icons[item.kind]}
          </span>
          <span className={styles.rowCopy}>
            <span className={styles.rowTitle}>{item.title}</span>
            <span className={styles.rowDetail}>{item.detail}</span>
          </span>
          <span className={styles.resultAction} aria-hidden>
            Open
          </span>
        </li>
      ))}
    </ul>
  );
}

function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`${ui.ghost} ${styles.alignStart}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Keyboard shortcuts
      </button>
      {open ? (
        <dl className={styles.shortcuts}>
          {shortcuts.map(([keys, action]) => (
            <div key={keys}>
              <dt>
                <kbd className={styles.kbd}>{keys}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}
