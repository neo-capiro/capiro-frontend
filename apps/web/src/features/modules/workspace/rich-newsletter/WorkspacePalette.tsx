"use client";
import type { ReactNode } from "react";
import {
  AlignLeft,
  Type,
  Image,
  Flag,
  MousePointer2,
  Minus,
  MoveVertical,
  Video,
  Share2,
  Code,
  Plug,
  PanelBottom,
} from "lucide-react";
import {
  NEWSLETTER_BLOCK_LABELS,
  NEWSLETTER_COLUMN_RATIOS,
  type NewsletterBlockKind,
  type NewsletterDesign,
} from "@capiro/shared/newsletter";
import { startBlockDrag } from "./content/structure-drag";
import type { StructureAction } from "./content/structure";
import styles from "./workspace.module.css";

const palette = [
  ["heading", Type],
  ["paragraph", AlignLeft],
  ["image", Image],
  ["logo", Flag],
  ["button", MousePointer2],
  ["divider", Minus],
  ["spacer", MoveVertical],
  ["video", Video],
  ["social", Share2],
  ["code", Code],
  ["apps", Plug],
  ["footer", PanelBottom],
] as const;

export function WorkspacePalette({
  design,
  change,
  ai,
}: {
  design: NewsletterDesign;
  change: (action: StructureAction) => void;
  ai: ReactNode;
}) {
  const section =
    design.sections.find((item) => item.name === "Body") ?? design.sections[0];
  const add = (
    kind: NewsletterBlockKind,
    ratio?: (typeof NEWSLETTER_COLUMN_RATIOS)[number],
  ) => {
    if (section)
      change({
        type: "addBlock",
        target: { sectionId: section.id },
        kind,
        ratio,
      });
  };
  return (
    <>
      <h2>Add content</h2>
      <p className={styles.muted}>
        Drag a block into your email or click to add it.
      </p>
      {!section && (
        <button onClick={() => change({ type: "addSection" })}>
          Add your first section
        </button>
      )}
      <div className={styles.blockGrid}>
        {palette.map(([kind, Icon]) => (
          <button
            key={kind}
            disabled={!section}
            draggable
            onDragStart={(event) =>
              startBlockDrag(event.dataTransfer, { type: "add", kind })
            }
            onClick={() => add(kind)}
          >
            <Icon size={24} aria-hidden="true" />
            <span>{NEWSLETTER_BLOCK_LABELS[kind]}</span>
          </button>
        ))}
      </div>
      <div className={styles.aiGrid}>{ai}</div>
      <h3>Columns</h3>
      <div className={styles.ratioGrid}>
        {NEWSLETTER_COLUMN_RATIOS.map((ratio) => (
          <button
            key={ratio}
            disabled={!section}
            aria-label={`Columns ${ratio}`}
            draggable
            onDragStart={(event) =>
              startBlockDrag(event.dataTransfer, {
                type: "add",
                kind: "columns",
                ratio,
              })
            }
            onClick={() => add("columns", ratio)}
          >
            <span
              className={styles.ratioMini}
              aria-hidden="true"
              style={{
                gridTemplateColumns: ratio.includes(":")
                  ? ratio
                      .split(":")
                      .map((value) => `${value}fr`)
                      .join(" ")
                  : `repeat(${ratio},1fr)`,
              }}
            >
              {Array.from(
                { length: ratio.includes(":") ? 2 : Number(ratio) },
                (_, index) => (
                  <i key={index} />
                ),
              )}
            </span>
            {ratio}
          </button>
        ))}
      </div>
    </>
  );
}
