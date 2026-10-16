import type { ReactNode } from "react";
import surfaces from "./surfaces.module.css";

export type SourceSummary = {
  id: string;
  title: string;
  meta: string;
  summary: string;
};

/** One cited source: title, provenance line, what it supports and its evidence action. */
export function SourceCard({
  source,
  selected = false,
  action,
}: {
  source: SourceSummary;
  selected?: boolean;
  action: ReactNode;
}) {
  return (
    <article
      className={surfaces.sourceCard}
      aria-label={source.title}
      {...(selected ? { "data-selected": "" } : {})}
    >
      <h3>{source.title}</h3>
      <p className={surfaces.caption}>{source.meta}</p>
      <p className={surfaces.small}>{source.summary}</p>
      {action}
    </article>
  );
}
