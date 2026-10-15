"use client";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { TextField } from "../../ui/TextField";
import { Notice } from "../../ui/Notice";
import ui from "../../ui/meri-ui.module.css";
import { MemoryCard, type MemoryItem } from "./MemoryCard";
import { RecallFilter, type RecallPeriod } from "./RecallFilter";
import styles from "./memory.module.css";

export type MemoryRecallView = {
  client: string;
  initialQuery: string;
  items: readonly MemoryItem[];
};

const matches = (item: MemoryItem, query: string) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = [item.title, item.meta, item.fact, ...item.terms]
    .join(" ")
    .toLowerCase();
  return terms.some((term) => text.includes(term));
};

/** 05.04 Institutional Memory recall: approved, personal and historical memory with status. */
export function MemoryRecallScreen({
  view,
  unavailable,
}: {
  view: MemoryRecallView;
  unavailable: string;
}) {
  const [query, setQuery] = useState(view.initialQuery);
  const [period, setPeriod] = useState<RecallPeriod>("current");
  const results = useMemo(
    () =>
      view.items.filter(
        (item) =>
          matches(item, query) && (period === "current" || item.historical),
      ),
    [view.items, query, period],
  );
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Institutional Memory"
        description="Approved knowledge, personal memory and sourced history"
      />
      <div className={styles.search} role="search" aria-label="Memory">
        <TextField
          label="Search memory"
          type="search"
          value={query}
          onChange={setQuery}
        />
        <button
          type="button"
          className={ui.outline}
          disabled
          title={unavailable}
          aria-label={`Client scope: ${view.client}`}
        >
          <ChevronDown aria-hidden /> {view.client}
        </button>
        <RecallFilter value={period} onChange={setPeriod} />
      </div>
      <p className="sr-only" role="status">
        {results.length === 1 ? "1 memory" : `${results.length} memories`} shown
      </p>
      {results.length ? (
        <div className={styles.memoryList}>
          {results.map((item) => (
            <MemoryCard key={item.id} item={item} unavailable={unavailable} />
          ))}
        </div>
      ) : (
        <Notice title="No memory matched in this search">
          Nothing was returned for this query within {view.client} and the
          selected period. This does not show that no such memory exists.
        </Notice>
      )}
    </div>
  );
}
