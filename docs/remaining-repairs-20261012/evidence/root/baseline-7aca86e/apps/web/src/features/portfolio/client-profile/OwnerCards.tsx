"use client";
import { useRef, useState } from "react";
import { initials, memberName } from "@/features/portfolio/index/public";
import { ownerLabels } from "./ordered-owners";
import type { useOrderedOwners } from "./useOrderedOwners";
import styles from "./owners.module.css";

export function OwnerCards({
  editor,
  blocked,
  roles,
}: {
  editor: ReturnType<typeof useOrderedOwners>;
  blocked: boolean;
  roles: Readonly<Record<string, string | null>>;
}) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const handles = useRef(new Map<number, HTMLButtonElement>());
  const disabled = blocked || !editor.editable || editor.stale;
  const last = editor.slots.findLastIndex(Boolean);
  function move(from: number, to: number) {
    if (disabled || to < 0 || to > last || from === to) return;
    editor.reorder(from, to);
    setAnnouncement(
      `Owner moved to ${ownerLabels[to]}. Save owners to apply this order.`,
    );
    requestAnimationFrame(() => handles.current.get(to)?.focus());
  }
  return (
    <>
      <ol className={styles.list} aria-label="Ordered account owners">
        {ownerLabels.slice(0, Math.min(4, last + 2)).map((rank, index) => {
          const value = editor.slots[index] ?? "";
          const person = editor.options.data?.find(
            (member) => member.id === value,
          );
          const name = person
            ? memberName(person)
            : value
              ? "Unavailable owner"
              : "Unassigned";
          return (
            <li
              key={rank}
              className={`${styles.card} ${index === 0 && value ? styles.primary : ""} ${!value ? styles.empty : ""}`}
              onDragOver={(event) => {
                if (!disabled && dragged !== null) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragged !== null) move(dragged, index);
                setDragged(null);
              }}
            >
              {value && (
                <>
                  <button
                    type="button"
                    className={styles.grip}
                    aria-label={`Reorder ${rank} owner`}
                    aria-describedby="owner-reorder-help"
                    ref={(element) => {
                      if (element) handles.current.set(index, element);
                      else handles.current.delete(index);
                    }}
                    disabled={disabled}
                    draggable={!disabled}
                    onDragStart={(event) => {
                      setDragged(index);
                      event.dataTransfer.setData("text/plain", String(index));
                    }}
                    onDragEnd={() => setDragged(null)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowUp" ||
                        event.key === "ArrowDown"
                      ) {
                        event.preventDefault();
                        move(index, index + (event.key === "ArrowUp" ? -1 : 1));
                      }
                    }}
                  >
                    <span aria-hidden="true">⋮⋮</span>
                  </button>
                  <span className={styles.avatar} aria-hidden="true">
                    {person ? initials(name) : "—"}
                  </span>
                </>
              )}
              <div className={styles.person}>
                <select
                  aria-label={`${rank} owner`}
                  value={value}
                  disabled={disabled}
                  onChange={(event) => editor.edit(index, event.target.value)}
                >
                  <option value="">
                    {value ? "Unassigned" : `+ Add owner (${rank})`}
                  </option>
                  {value && !person && (
                    <option value={value} disabled>
                      Unavailable owner · {value}
                    </option>
                  )}
                  {editor.options.data?.map((member) => (
                    <option key={member.id} value={member.id}>
                      {memberName(member)}
                    </option>
                  ))}
                </select>
                {value && (
                  <small>
                    {person
                      ? roles[value] || "Team member"
                      : "Unavailable member"}
                  </small>
                )}
              </div>
              {value && <span className={styles.rank}>{rank}</span>}
              {value && index > 0 && (
                <button
                  className={styles.remove}
                  type="button"
                  disabled={disabled}
                  aria-label={`Clear ${rank} owner`}
                  onClick={() => editor.edit(index, "")}
                >
                  <span aria-hidden="true">✕</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <p id="owner-reorder-help" className="srOnly">
        Use the arrow keys on a reorder handle to move an owner. Changes require
        Save owners.
      </p>
      <p className="srOnly" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
