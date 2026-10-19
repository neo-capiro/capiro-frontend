"use client";
import styles from "./files.module.css";
export function FileToolbar({
  search,
  source,
  sources,
  sort,
  onSearch,
  onSource,
  onSort,
}: {
  search: string;
  source: string;
  sources: string[];
  sort: string;
  onSearch: (value: string) => void;
  onSource: (value: string) => void;
  onSort: (value: string) => void;
}) {
  return (
    <div className={styles.toolbar}>
      <input
        className={styles.search}
        aria-label="Search files"
        placeholder="Search files…"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
      />
      <div
        className={styles.sourceFilters}
        role="group"
        aria-label="File source"
      >
        {["", ...sources].map((value) => (
          <button
            key={value}
            className="button"
            aria-pressed={source === value}
            onClick={() => onSource(value)}
          >
            {value || "All"}
          </button>
        ))}
      </div>
      <label className={styles.sort}>
        Sort by{" "}
        <select
          aria-label="Sort files"
          value={sort}
          onChange={(event) => onSort(event.target.value)}
        >
          <option value="created">Created · newest</option>
          <option value="name">Name</option>
        </select>
      </label>
    </div>
  );
}
