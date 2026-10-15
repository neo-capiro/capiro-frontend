"use client";
import { useState } from "react";
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
type Filters = ReturnType<typeof useHistoryFilters>;
const unique = (values: readonly string[]) => [...new Set(values)];

/** Local title search plus client and status narrowing; never a server query. */
export function useHistoryFilters(all: readonly HistoryRow[]) {
  const [query, setQuery] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = all.filter(
    (row) =>
      row.title.toLowerCase().includes(needle) &&
      (!client || row.client === client) &&
      (!status || row.status === status),
  );
  return { query, setQuery, client, setClient, status, setStatus, rows };
}

export function HistoryFilters({
  filters,
  rows,
}: {
  filters: Filters;
  rows: readonly HistoryRow[];
}) {
  return (
    <div className={styles.filters} role="search">
      <FormField
        label="Search"
        className={styles.searchField}
        placeholder="Search by title"
        value={filters.query}
        onChange={filters.setQuery}
      />
      <FilterMenu
        label="Filter by client"
        allLabel="All clients"
        icon={<ChevronDown aria-hidden />}
        options={unique(rows.map((row) => row.client))}
        value={filters.client}
        onChange={filters.setClient}
      />
      <FilterMenu
        label="Filter by status"
        allLabel="All statuses"
        icon={<ListFilter aria-hidden />}
        options={unique(rows.map((row) => row.status))}
        value={filters.status}
        onChange={filters.setStatus}
      />
    </div>
  );
}
