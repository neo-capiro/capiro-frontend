"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, MessageSquare, Sparkle } from "lucide-react";
import { FormField } from "../../ui/FormField";
import { StateMessage } from "../../ui/StateMessage";
import ui from "../../ui/meri-ui.module.css";
import rows from "../../ui/detail-row.module.css";
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

const words = (query: string) =>
  query.toLowerCase().split(/\s+/).filter(Boolean);
/** A result matches when any query word appears in its title or detail. */
const matches = (item: PaletteItem, terms: readonly string[]) => {
  const text = `${item.title} ${item.detail}`.toLowerCase();
  return !terms.length || terms.some((term) => text.includes(term));
};
/** Commands are suggested alongside matching work; otherwise they must match too (01.05A). */
const search = (items: readonly PaletteItem[], query: string) => {
  const terms = words(query);
  const work = items.some(
    (item) => item.kind !== "command" && matches(item, terms),
  );
  return items.filter(
    (item) => matches(item, terms) || (work && item.kind === "command"),
  );
};

/** Combobox and listbox with arrow-key highlight; Enter opens registered destinations only. */
export function CommandPalette({ view }: { view: PaletteView }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(view.initialQuery);
  const [active, setActive] = useState(0);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const results = search(view.items, query);
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
      <FormField
        label="Search"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={results.length ? listId : undefined}
        aria-autocomplete="list"
        autoFocus
        ref={input}
        aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
        value={query}
        onChange={(value) => {
          setQuery(value);
          setActive(0);
          setMessage("");
        }}
        onKeyDown={move}
      />
      {results.length ? (
        <PaletteResults
          listId={listId}
          results={results}
          current={current}
          onHover={(item) => setActive(results.indexOf(item))}
          onOpen={open}
        />
      ) : null}
      <p className="sr-only" role="status">
        {message || `${results.length} results`}
      </p>
      <ShortcutHelp />
      {results.length ? null : (
        <NoMatches
          onClear={() => {
            setQuery("");
            setActive(0);
            input.current?.focus();
          }}
        />
      )}
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
          <span className={rows.rowIcon} aria-hidden>
            {icons[item.kind]}
          </span>
          <span className={rows.rowCopy}>
            <span className={rows.rowTitle}>{item.title}</span>
            <span className={rows.rowDetail}>{item.detail}</span>
          </span>
          <span className={styles.resultAction} aria-hidden>
            Open
          </span>
        </li>
      ))}
    </ul>
  );
}

function NoMatches({ onClear }: { onClear: () => void }) {
  return (
    <StateMessage
      title="No matching commands or work"
      status="No matches"
      action={
        <button type="button" className={ui.outline} onClick={onClear}>
          Clear search
        </button>
      }
    >
      No permitted result matches this search. Try a different query or open
      Conversations. An empty search result does not establish that work is
      absent.
    </StateMessage>
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
