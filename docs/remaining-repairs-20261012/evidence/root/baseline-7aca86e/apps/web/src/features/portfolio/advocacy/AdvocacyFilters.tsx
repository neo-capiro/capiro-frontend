"use client";
import { useId } from "react";
import { SelectField } from "@/shared/portfolio/ui/SelectField";
import { lifecycleStatuses, statusLabel } from "./history-model";
import type { Matter } from "./contracts";
import styles from "./history.module.css";

export function AdvocacyFilters({
  view,
  onView,
  search,
  onSearch,
  status,
  onStatus,
  matters,
}: {
  view: "timeline" | "matters";
  onView: (view: "timeline" | "matters") => void;
  search: string;
  onSearch: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  matters: Matter[] | undefined;
}) {
  const id = useId();
  const statuses = [
    ...new Set([
      ...lifecycleStatuses,
      ...(matters?.map((matter) => matter.status) ?? []),
      ...(status ? [status] : []),
    ]),
  ];
  return (
    <div className={styles.filters}>
      <div className={styles.views} aria-label="History view">
        <button
          className={`button ${view === "timeline" ? "primary" : ""}`}
          aria-pressed={view === "timeline"}
          onClick={() => onView("timeline")}
        >
          Timeline
        </button>
        <button
          className={`button ${view === "matters" ? "primary" : ""}`}
          aria-pressed={view === "matters"}
          onClick={() => onView("matters")}
        >
          Matters
        </button>
      </div>
      <div className={styles.field}>
        <label htmlFor={id}>Search advocacy history</label>
        <input
          id={id}
          type="search"
          placeholder="Search title, summary, PE or bill"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          disabled={!matters}
        />
      </div>
      <SelectField
        label="Matter status"
        value={status}
        onChange={(event) => onStatus(event.target.value)}
        disabled={!matters}
      >
        <option value="">All statuses</option>
        {statuses.map((value) => (
          <option key={value} value={value}>
            {statusLabel(value)}
          </option>
        ))}
      </SelectField>
      {!matters && (
        <p className="muted">
          Search and status filters require the current matter list.
        </p>
      )}
    </div>
  );
}
