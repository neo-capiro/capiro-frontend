"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FormField } from "../../ui/FormField";
import { Notice } from "../../ui/Notice";
import ui from "../../ui/meri-ui.module.css";
import { MemoryCard, type MemoryItem } from "./MemoryCard";
import styles from "./memory.module.css";

/** Current memory is eligible governed recall; history holds superseded records for provenance. */
export type MemoryView = "current" | "history";

export type MemoryRecallView = {
  view: MemoryView;
  title: string;
  description: string;
  client: string;
  initialQuery: string;
  items: readonly MemoryItem[];
};

const views: readonly { id: MemoryView; label: string }[] = [
  { id: "current", label: "Current memory" },
  { id: "history", label: "History" },
];

const matches = (item: MemoryItem, query: string) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = [item.title, item.meta, item.fact, ...item.terms]
    .join(" ")
    .toLowerCase();
  return terms.some((term) => text.includes(term));
};

/** 05.04 Institutional Memory recall and its separate 05.04B history view. */
export function MemoryRecallScreen({
  view,
  viewHrefs,
  unavailable,
}: {
  view: MemoryRecallView;
  /** Destination of each memory view; the current view links to itself. */
  viewHrefs: Readonly<Record<MemoryView, string>>;
  unavailable: string;
}) {
  const [query, setQuery] = useState(view.initialQuery);
  const results = useMemo(
    () => view.items.filter((item) => matches(item, query)),
    [view.items, query],
  );
  const scope = view.view === "current" ? "current memory" : "memory history";
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <div className={styles.search}>
        <div role="search" aria-label="Memory" className={styles.searchField}>
          <FormField
            label="Search memory"
            type="search"
            value={query}
            onChange={setQuery}
          />
        </div>
        <button
          type="button"
          className={ui.outline}
          disabled
          title={unavailable}
          aria-label={`Client scope: ${view.client}`}
        >
          <ChevronDown aria-hidden /> {view.client}
        </button>
        <nav aria-label="Memory views" className={styles.viewSwitch}>
          {views.map((option) => (
            <Link
              key={option.id}
              href={viewHrefs[option.id]}
              className={option.id === view.view ? ui.primary : ui.outline}
              aria-current={option.id === view.view ? "page" : undefined}
            >
              <ListFilter aria-hidden /> {option.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="sr-only" role="status">
        {results.length === 1 ? "1 record" : `${results.length} records`} shown
        in {scope}
      </p>
      {results.length ? (
        <div className={styles.memoryList}>
          {results.map((item) => (
            <MemoryCard key={item.id} item={item} unavailable={unavailable} />
          ))}
        </div>
      ) : (
        <Notice title="No memory matched in this search">
          Nothing was returned for this query within {view.client} {scope}. This
          does not show that no such memory exists.
        </Notice>
      )}
    </div>
  );
}
