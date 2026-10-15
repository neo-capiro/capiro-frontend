"use client";
import type { Ref } from "react";
import { StatusPill, type StatusTone } from "../../ui/StatusPill";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import type { SourceSummary } from "../../ui/SourceCard";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./sources.module.css";

export type EvidenceSource = SourceSummary & {
  status: { label: string; tone: StatusTone };
  fields: readonly FieldRow[];
  recordReference: string;
  excerpt: string;
  /** What the source supports and, explicitly, what it does not establish. */
  limit: string;
};

/** Evidence detail for the selected source: status, record fields and authorized excerpt. */
export function EvidenceDetail({
  source,
  headingRef,
  onCopy,
}: {
  source: EvidenceSource;
  headingRef: Ref<HTMLHeadingElement>;
  onCopy: (reference: string) => void;
}) {
  const headingId = `evidence-${source.id}`;
  return (
    <section className={surfaces.panel} aria-labelledby={headingId}>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className={surfaces.statTitle}
      >
        {source.title}
      </h2>
      <span className={`${surfaces.pillSlot} ${styles.statusWide}`}>
        <StatusPill tone={source.status.tone}>{source.status.label}</StatusPill>
      </span>
      <FieldTable
        caption={`Evidence fields for ${source.title}`}
        fieldLabel="Evidence field"
        rows={source.fields}
        shares={[220, 414]}
      />
      <h3 className={surfaces.sectionTitle}>Authorized excerpt</h3>
      <blockquote className={styles.quote}>“{source.excerpt}”</blockquote>
      <button
        type="button"
        className={ui.outline}
        onClick={() => onCopy(source.recordReference)}
      >
        Copy record reference
      </button>
      <p className={`${surfaces.small} ${ui.muted}`}>{source.limit}</p>
    </section>
  );
}
