"use client";
import { ActionButton } from "../../../shared/module-ui";
import styles from "./directory.module.css";
export function DirectoryPagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const start = total ? (page - 1) * pageSize + 1 : 0;
  return (
    <footer className={styles.footer}>
      <span>
        Showing {start} to {Math.min(page * pageSize, total)} of{" "}
        {total.toLocaleString()}
      </span>
      <div className={styles.actions}>
        <ActionButton disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </ActionButton>
        <ActionButton
          disabled={page * pageSize >= total}
          onClick={() => onPage(page + 1)}
        >
          Next
        </ActionButton>
      </div>
    </footer>
  );
}
