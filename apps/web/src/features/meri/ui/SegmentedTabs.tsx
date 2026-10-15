"use client";
import { useRef, type KeyboardEvent } from "react";
import styles from "./meri-ui.module.css";

/** Segmented view switch with arrow-key navigation between tabs. */
export function SegmentedTabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
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
            if (node) refs.current.set(option.id, node);
            else refs.current.delete(option.id);
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
