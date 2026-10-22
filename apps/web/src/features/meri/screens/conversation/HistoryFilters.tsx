"use client";
import { useState, type Ref } from "react";
import { ChevronDown, ListFilter } from "lucide-react";
import { FilterMenu } from "./FilterMenu";
import { FormField } from "../../ui/FormField";
import styles from "./conversation.module.css";

export type HistoryRow = {
  id: string;
  title: string;
  client: string;
  status: string;
  updated: string;
};
/** Search text and narrowing values a history view opens with (Figma 01.04B–G). */
export type HistoryQuery = { query?: string; client?: string; status?: string };
type Filters = ReturnType<typeof useHistoryFilters>;
const unique = (values: readonly string[]) => [...new Set(values)];

/** Local title search plus client and status narrowing; never a server query. */
export function useHistoryFilters(
  all: readonly HistoryRow[],
  initial: HistoryQuery = {},
) {
  const [query, setQuery] = useState(initial.query ?? "");
  const [client, setClient] = useState(initial.client ?? "");
  const [status, setStatus] = useState(initial.status ?? "");
  const needle = query.trim().toLowerCase();
  const rows = all.filter(
    (row) =>
      row.title.toLowerCase().includes(needle) &&
      (!client || row.client === client) &&
      (!status || row.status === status),
  );
  const clear = () => {
    setQuery("");
    setClient("");
    setStatus("");
  };
  return { query, setQuery, client, setClient, status, setStatus, rows, clear };
}

export function HistoryFilters({
  filters,
  rows,
  openMenu,
  searchRef,
}: {
  filters: Filters;
  rows: readonly HistoryRow[];
  /** Menu shown open on load by the 13.21 / 13.22 fixture frames. */
  openMenu?: "client" | "status" | undefined;
  searchRef?: Ref<HTMLInputElement> | undefined;
}) {
  return (
    <div className={styles.filters} role="search">
      <FormField
        label="Search"
        className={styles.searchField}
        placeholder="Search conversations…"
        value={filters.query}
        onChange={filters.setQuery}
        ref={searchRef}
      />
      <FilterMenu
        title="Filter by client"
        triggerClassName={styles.clientFilter}
        description="Choose the scope of the conversation list."
        allLabel="All clients"
        icon={<ChevronDown aria-hidden />}
        options={unique(rows.map((row) => row.client))}
        value={filters.client}
        onChange={filters.setClient}
        defaultOpen={openMenu === "client"}
      />
      <FilterMenu
        title="Filter by status"
        triggerClassName={styles.statusFilter}
        description="Choose the state of the conversation list."
        allLabel="All statuses"
        icon={<ListFilter aria-hidden />}
        options={unique(rows.map((row) => row.status))}
        value={filters.status}
        onChange={filters.setStatus}
        defaultOpen={openMenu === "status"}
      />
    </div>
  );
}
