import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./module-ui.module.css";

export type TableColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  align?: "left" | "right";
  width?: string;
  /** Hide the visible heading while retaining its accessible column name. */
  visuallyHiddenHeader?: boolean;
};
export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  caption,
  emptyMessage = "No records found",
  selectedRowKey,
  onRowActivate,
  rowActionLabel,
  scrollRegion = false,
}: {
  rows: readonly Row[];
  columns: readonly TableColumn<Row>[];
  rowKey: (row: Row) => string;
  caption: string;
  emptyMessage?: string;
  selectedRowKey?: string | null;
  onRowActivate?: (row: Row) => void;
  rowActionLabel?: (row: Row) => string;
  /**
   * Make an overflowing scroll container keyboard reachable as a named region.
   * Off by default; when the table fits, no extra tab stop or role is added.
   */
  scrollRegion?: boolean;
}) {
  const [scrollRef, overflowing] = useScrollOverflow(scrollRegion);
  return (
    <div
      ref={scrollRegion ? scrollRef : undefined}
      className={styles.tableScroll}
      tabIndex={overflowing ? 0 : undefined}
      role={overflowing ? "region" : undefined}
      aria-label={overflowing ? caption : undefined}
    >
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <TableHeader columns={columns} />
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={
                  [
                    selectedRowKey === rowKey(row)
                      ? styles.tableSelectedRow
                      : "",
                    onRowActivate ? styles.tableActionRow : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                tabIndex={onRowActivate ? 0 : undefined}
                aria-label={rowActionLabel?.(row)}
                onClick={
                  onRowActivate
                    ? (event) => {
                        if (
                          event.target instanceof Element &&
                          event.target.closest(
                            "a,button,input,select,textarea,[role='button']",
                          )
                        )
                          return;
                        onRowActivate(row);
                      }
                    : undefined
                }
                onKeyDown={
                  onRowActivate
                    ? (event) => {
                        if (
                          event.target !== event.currentTarget ||
                          (event.key !== "Enter" && event.key !== " ")
                        )
                          return;
                        event.preventDefault();
                        onRowActivate(row);
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align }}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Track whether a scroll container actually overflows horizontally. Only an
 * overflowing container becomes a tab stop, so a table that fits at desktop
 * width adds no keyboard stop and no role.
 */
function useScrollOverflow(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper || !active) {
      setOverflowing(false);
      return;
    }
    const sync = () =>
      setOverflowing(wrapper.scrollWidth - wrapper.clientWidth > 1);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(wrapper);
    for (const child of Array.from(wrapper.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [active]);
  return [ref, overflowing] as const;
}

/** Keep a column's accessible name when its visible label is blank by design. */
function TableHeader<Row>({
  columns,
}: {
  columns: readonly TableColumn<Row>[];
}) {
  return (
    <thead>
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            scope="col"
            style={{ textAlign: column.align, width: column.width }}
          >
            {column.visuallyHiddenHeader ? (
              <span className="sr-only">{column.label}</span>
            ) : (
              column.label
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
}
