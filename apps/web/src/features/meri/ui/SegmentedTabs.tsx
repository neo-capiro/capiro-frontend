"use client";
import { useRef, type KeyboardEvent } from "react";
import styles from "./meri-ui.module.css";

/** Segmented view switch with arrow-key navigation between tabs. */
export function SegmentedTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  focusRequest,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Selection whose page switch replaced the tab list; the selected tab takes focus. */
  focusRequest?: { current: string | null } | undefined;
}) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const move = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.id);
    refs.current.get(next.id)?.focus();
  };
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          key={option.id}
          ref={(node) => {
            if (!node) {
              refs.current.delete(option.id);
              return;
            }
            refs.current.set(option.id, node);
            // A page switch replaces this tab list, so the button that started the switch
            // is gone by the time the next page renders. The selected tab claims the
            // request its host recorded instead of leaving focus on the document body.
            if (focusRequest?.current === option.id && value === option.id) {
              focusRequest.current = null;
              node.focus();
            }
          }}
          type="button"
          role="tab"
          className={styles.ghost}
          aria-selected={option.id === value}
          tabIndex={option.id === value ? 0 : -1}
          onClick={() => onChange(option.id)}
          onKeyDown={(event) => move(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
