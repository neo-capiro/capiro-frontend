"use client";
import type { KeyboardEvent, ReactNode } from "react";
import styles from "./meri-ui.module.css";

export type DataColumn<Row> = {
  key: string;
  label: string;
  /** Share of the table width, matching the Figma column geometry. */
  width: number;
  render: (row: Row) => ReactNode;
};

/** Striped data table; optional single-row selection drives page actions. */
export function DataTable<Row extends { id: string }>({
  caption,
  columns,
  rows,
  selectedId,
  onSelect,
}: {
  caption: string;
  columns: readonly DataColumn<Row>[];
  rows: readonly Row[];
  selectedId?: string | undefined;
  onSelect?: (id: string) => void;
}) {
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  const keySelect = (event: KeyboardEvent, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect?.(id);
  };
  return (
    <div className={styles.tableFrame}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((column) => (
            <col
              key={column.key}
              style={{ width: `${(column.width / total) * 100}%` }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              {...(onSelect
                ? {
                    "data-selectable": "",
                    tabIndex: 0,
                    "aria-selected": row.id === selectedId,
                    onClick: () => onSelect(row.id),
                    onKeyDown: (event: KeyboardEvent) =>
                      keySelect(event, row.id),
                  }
                : {})}
            >
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
