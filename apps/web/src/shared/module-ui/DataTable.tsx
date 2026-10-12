import type { ReactNode } from "react";
import styles from "./module-ui.module.css";

export type TableColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => ReactNode;
  align?: "left" | "right";
  width?: string;
};
export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  caption,
  emptyMessage = "No records found",
}: {
  rows: readonly Row[];
  columns: readonly TableColumn<Row>[];
  rowKey: (row: Row) => string;
  caption: string;
  emptyMessage?: string;
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={{ textAlign: column.align, width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={rowKey(row)}>
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
