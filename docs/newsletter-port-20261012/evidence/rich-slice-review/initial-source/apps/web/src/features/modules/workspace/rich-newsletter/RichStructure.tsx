"use client";
import {
  NEWSLETTER_BLOCK_LABELS,
  type NewsletterBlock,
  type NewsletterDesign,
  type NewsletterBlockKind,
} from "@capiro/shared/newsletter";
import { ActionButton } from "../../../../shared/module-ui";
import styles from "./rich-newsletter.module.css";

const available: NewsletterBlockKind[] = [
  "heading",
  "paragraph",
  "image",
  "button",
  "divider",
  "spacer",
  "code",
];
function BlockList({
  blocks,
  selectedId,
  select,
}: {
  blocks: NewsletterBlock[];
  selectedId: string | null;
  select: (id: string) => void;
}) {
  return (
    <ul className={styles.blockList}>
      {blocks.map((block) => (
        <li key={block.id}>
          <button
            type="button"
            aria-pressed={block.id === selectedId}
            onClick={() => select(block.id)}
          >
            {NEWSLETTER_BLOCK_LABELS[block.kind]}
            {block.text ? ` · ${block.text.slice(0, 32)}` : ""}
          </button>
          {block.columns.map((column, index) => (
            <div key={index} aria-label={`Column ${index + 1}`}>
              <BlockList
                blocks={column}
                selectedId={selectedId}
                select={select}
              />
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
export function RichStructure({
  design,
  selectedId,
  select,
  add,
}: {
  design: NewsletterDesign;
  selectedId: string | null;
  select: (id: string) => void;
  add: (section: string, kind: NewsletterBlockKind) => void;
}) {
  return (
    <nav className={styles.structure} aria-label="Newsletter structure">
      <h2>Content</h2>
      {design.sections.map((section) => (
        <section key={section.id}>
          <h3>{section.name}</h3>
          <BlockList
            blocks={section.blocks}
            selectedId={selectedId}
            select={select}
          />
          <details>
            <summary>Add block to {section.name}</summary>
            <div className={styles.palette}>
              {available.map((kind) => (
                <ActionButton key={kind} onClick={() => add(section.id, kind)}>
                  {NEWSLETTER_BLOCK_LABELS[kind]}
                </ActionButton>
              ))}
            </div>
          </details>
        </section>
      ))}
      <p>
        Additional content tools, hosted surveys and product blocks are
        unavailable in this editor preview.
      </p>
    </nav>
  );
}
