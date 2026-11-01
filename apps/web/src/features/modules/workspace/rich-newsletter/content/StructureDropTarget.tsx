"use client";
import type { ReactNode } from "react";
import type { BlockContainer, StructureAction } from "./structure";
import { NEWSLETTER_DRAG_TYPE, readBlockDrop } from "./structure-drag";
import styles from "./content.module.css";

export function StructureDropTarget({
  target,
  label,
  change,
  children,
}: {
  target: BlockContainer;
  label: string;
  change: (action: StructureAction) => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={styles.dropTarget}
      aria-label={label}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(NEWSLETTER_DRAG_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(NEWSLETTER_DRAG_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        const action = readBlockDrop(event.dataTransfer, target);
        if (action) change(action);
      }}
    >
      {children ?? <span>{label}</span>}
    </div>
  );
}
