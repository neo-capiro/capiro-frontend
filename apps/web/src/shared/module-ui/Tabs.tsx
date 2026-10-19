"use client";

import { useId, useRef } from "react";
import styles from "./module-ui.module.css";

export type TabItem = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
};
export function Tabs({
  items,
  value,
  onChange,
  label = "Views",
}: {
  items: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const id = useId();
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map());
  const move = (current: string, key: string) => {
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.id === current);
    const target =
      key === "Home"
        ? enabled[0]
        : key === "End"
          ? enabled.at(-1)
          : enabled[
              (index + (key === "ArrowLeft" ? -1 : 1) + enabled.length) %
                enabled.length
            ];
    if (target) {
      onChange(target.id);
      buttons.current.get(target.id)?.focus();
    }
  };
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          id={`${id}-${item.id}`}
          ref={(node) => {
            if (node) buttons.current.set(item.id, node);
            else buttons.current.delete(item.id);
          }}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          tabIndex={value === item.id ? 0 : -1}
          disabled={item.disabled}
          className={value === item.id ? styles.selectedTab : ""}
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => {
            if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              move(item.id, event.key);
            }
          }}
        >
          {item.label}
          {item.count !== undefined && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
