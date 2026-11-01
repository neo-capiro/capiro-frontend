"use client";
import { ActionButton } from "../../../shared/module-ui";
import styles from "./directory.module.css";
export function DirectoryPagination({
  page,
  total,
  pageSize,
  onPage,
  shown,
  hasMore,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  /** Rows rendered on this page. Falls back to the reported total when absent. */
  shown?: number;
  /**
   * Whether another page exists. Some list endpoints report a `total` that is
   * clamped to the page size, so "page is full" is the only reliable signal
   * there; callers pass it explicitly.
   */
  hasMore?: boolean;
}) {
  const count =
    shown ??
    (total ? Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize)) : 0);
  const start = count ? (page - 1) * pageSize + 1 : 0;
  const end = count ? start + count - 1 : 0;
  const more = hasMore ?? page * pageSize < total;
  // A clamped total (equal to this page) would otherwise print a false ceiling.
  const totalKnown = total > end || !more;
  return (
    <footer className={styles.footer}>
      <span>
        {count === 0
          ? "No records"
          : totalKnown
            ? `Showing ${start} to ${end} of ${total.toLocaleString()}`
            : `Showing ${start} to ${end}`}
      </span>
      <div className={styles.actions}>
        <ActionButton disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </ActionButton>
        <ActionButton disabled={!more} onClick={() => onPage(page + 1)}>
          Next
        </ActionButton>
      </div>
    </footer>
  );
}
