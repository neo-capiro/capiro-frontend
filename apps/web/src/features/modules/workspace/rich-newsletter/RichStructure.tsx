"use client";
import {
  NEWSLETTER_BLOCK_LABELS,
  NEWSLETTER_COLUMN_RATIOS,
  type NewsletterBlock,
  type NewsletterDesign,
  type NewsletterBlockKind,
} from "@capiro/shared/newsletter";
import { ActionButton } from "../../../../shared/module-ui";
import { type BlockContainer, type StructureAction } from "./content/structure";
import styles from "./content/content.module.css";
import ui from "./library/sections.module.css";

const available: NewsletterBlockKind[] = [
  "heading",
  "paragraph",
  "image",
  "logo",
  "button",
  "divider",
  "spacer",
  "social",
  "video",
  "apps",
  "product",
  "product-rec",
  "survey",
  "code",
  "footer",
];
function AddBlock({
  target,
  label,
  change,
}: {
  target: BlockContainer;
  label: string;
  change: (action: StructureAction) => void;
}) {
  return (
    <details>
      <summary>Add block to {label}</summary>
      <div className={ui.actions}>
        {available.map((kind) => (
          <ActionButton
            className={ui.button}
            key={kind}
            onClick={() => change({ type: "addBlock", target, kind })}
          >
            {NEWSLETTER_BLOCK_LABELS[kind]}
          </ActionButton>
        ))}
      </div>
      <h3>Columns</h3>
      <div className={ui.actions} aria-label={`Column layouts for ${label}`}>
        {NEWSLETTER_COLUMN_RATIOS.map((ratio) => (
          <ActionButton
            className={ui.button}
            key={ratio}
            onClick={() =>
              change({ type: "addBlock", target, kind: "columns", ratio })
            }
          >
            {`Columns ${ratio}`}
          </ActionButton>
        ))}
      </div>
    </details>
  );
}
function BlockList({
  blocks,
  sectionId,
  selectedId,
  select,
  change,
}: {
  blocks: NewsletterBlock[];
  sectionId: string;
  selectedId: string | null;
  select: (id: string) => void;
  change: (action: StructureAction) => void;
}) {
  return (
    <ul className={styles.tree}>
      {blocks.map((block) => (
        <li key={block.id}>
          <ActionButton
            className={ui.button}
            aria-pressed={block.id === selectedId}
            onClick={() => select(block.id)}
          >
            {NEWSLETTER_BLOCK_LABELS[block.kind]}
            {block.text ? ` · ${block.text.slice(0, 32)}` : ""}
          </ActionButton>
          {block.columns.map((column, index) => (
            <div
              key={index}
              className={styles.column}
              aria-label={`Column ${index + 1}`}
            >
              <h3>Column {index + 1}</h3>
              <BlockList
                blocks={column}
                sectionId={sectionId}
                selectedId={selectedId}
                select={select}
                change={change}
              />
              <AddBlock
                target={{ sectionId, blockId: block.id, column: index }}
                label={`column ${index + 1}`}
                change={change}
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
  change,
  editSection,
  browse,
  saveSection,
  savedSectionIds,
}: {
  design: NewsletterDesign;
  selectedId: string | null;
  select: (id: string) => void;
  change: (action: StructureAction) => void;
  editSection: (id: string) => void;
  browse: (opener: HTMLButtonElement) => void;
  saveSection: (section: string) => void;
  savedSectionIds: readonly string[];
}) {
  return (
    <nav className={styles.panel} aria-label="Newsletter structure">
      <h2>Content</h2>
      <ActionButton
        className={ui.button}
        onClick={(event) => browse(event.currentTarget)}
      >
        Saved sections
      </ActionButton>
      {design.sections.map((section, index) => (
        <section
          key={section.id}
          className={ui.item}
          aria-label={`Section ${section.name}`}
        >
          <h3>{section.name || "Untitled section"}</h3>
          <div className={ui.actions}>
            <ActionButton
              className={ui.button}
              onClick={() => editSection(section.id)}
            >
              Edit section
            </ActionButton>
            <ActionButton
              className={ui.button}
              disabled={index === 0}
              onClick={() =>
                change({ type: "section", id: section.id, action: "up" })
              }
            >
              Move up
            </ActionButton>
            <ActionButton
              className={ui.button}
              disabled={index === design.sections.length - 1}
              onClick={() =>
                change({ type: "section", id: section.id, action: "down" })
              }
            >
              Move down
            </ActionButton>
            <ActionButton
              className={ui.button}
              onClick={() =>
                change({ type: "section", id: section.id, action: "duplicate" })
              }
            >
              Duplicate
            </ActionButton>
            <ActionButton
              className={ui.button}
              onClick={() =>
                change({ type: "section", id: section.id, action: "delete" })
              }
            >
              Delete section
            </ActionButton>
            <ActionButton
              className={ui.button}
              aria-label={`Save section ${section.name}`}
              disabled={!savedSectionIds.includes(section.id)}
              title={
                savedSectionIds.includes(section.id)
                  ? "Save the current stored section"
                  : "Save the newsletter before saving this section"
              }
              onClick={() => saveSection(section.id)}
            >
              Save section
            </ActionButton>
          </div>
          <BlockList
            blocks={section.blocks}
            sectionId={section.id}
            selectedId={selectedId}
            select={select}
            change={change}
          />
          <AddBlock
            target={{ sectionId: section.id }}
            label={section.name}
            change={change}
          />
        </section>
      ))}
      <ActionButton
        className={ui.button}
        primary
        disabled={design.sections.length >= 50}
        onClick={() => change({ type: "addSection" })}
      >
        Add blank section
      </ActionButton>
      <p>
        All edits are local and can be undone. Saved-section actions use current
        server content. Hosted survey authoring is separate.
      </p>
    </nav>
  );
}
