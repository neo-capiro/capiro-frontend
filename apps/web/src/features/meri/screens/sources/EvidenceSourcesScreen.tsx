"use client";
import { useRef, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Sources, SourcesContent, SourcesTrigger } from "@capiro/ui/sources";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import { SourceCard } from "../../ui/SourceCard";
import ui from "../../ui/meri-ui.module.css";
import { EvidenceDetail, type EvidenceSource } from "./EvidenceDetail";
import { CopyToast, useClipboardCopy } from "./CopyToast";
import styles from "./sources.module.css";

export type EvidenceSourcesView = {
  title: string;
  description: string;
  sources: readonly EvidenceSource[];
  /** Sources shown before the list is expanded. */
  visibleCount: number;
  initialSourceId: string;
};

/** 05.01 Evidence and citations: the cited sources and the selected source's evidence. */
export function EvidenceSourcesScreen({
  view,
  coverageHref,
  unavailable,
}: {
  view: EvidenceSourcesView;
  coverageHref?: string | undefined;
  unavailable: string;
}) {
  const [selectedId, setSelectedId] = useState(view.initialSourceId);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const clipboard = useClipboardCopy();
  const selected =
    view.sources.find((source) => source.id === selectedId) ?? view.sources[0];
  const select = (id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => detailHeading.current?.focus());
  };
  const card = (source: EvidenceSource) => (
    <SourceCard
      key={source.id}
      source={source}
      selected={source.id === selected?.id}
      action={
        <button
          type="button"
          className={ui.ghost}
          aria-pressed={source.id === selected?.id}
          aria-label={`View evidence for ${source.title}`}
          onClick={() => select(source.id)}
        >
          <ArrowUpRight aria-hidden /> View evidence
        </button>
      }
    />
  );
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <div className={ui.row}>
        <LinkAction
          variant="outline"
          href={coverageHref}
          unavailable={unavailable}
        >
          Sources &amp; coverage
        </LinkAction>
      </div>
      <div className={styles.evidenceLayout}>
        <SourceList
          sources={view.sources}
          visibleCount={view.visibleCount}
          renderCard={card}
        />
        {selected ? (
          <EvidenceDetail
            source={selected}
            headingRef={detailHeading}
            onCopy={(reference) => void clipboard.copy(reference)}
          />
        ) : null}
      </div>
      <CopyToast
        status={clipboard.status}
        subject="Record reference"
        onDismiss={clipboard.dismiss}
      />
    </div>
  );
}

/** Adopted AI Elements Sources: the first sources stay visible; the rest expand in place. */
function SourceList({
  sources,
  visibleCount,
  renderCard,
}: {
  sources: readonly EvidenceSource[];
  visibleCount: number;
  renderCard: (source: EvidenceSource) => ReactNode;
}) {
  const hidden = sources.slice(visibleCount);
  return (
    <Sources
      className={styles.sourceList}
      aria-label="Cited sources"
      role="region"
    >
      {sources.slice(0, visibleCount).map(renderCard)}
      {hidden.length ? (
        <>
          <SourcesContent className={styles.sourceMore}>
            {hidden.map(renderCard)}
          </SourcesContent>
          <SourcesTrigger count={sources.length} className={ui.outline}>
            <span data-when="closed">Show all {sources.length} sources</span>
            <span data-when="open">Show fewer sources</span>
          </SourcesTrigger>
        </>
      ) : null}
    </Sources>
  );
}
