"use client";
import { DataTable, type DataColumn } from "./DataTable";
import styles from "./panel.module.css";

export type FieldRow = { field: string; value: string };
type KeyedRow = FieldRow & { id: string };

/** Two-column "field / value" table for exact action, receipt and configuration details. */
export function FieldTable({
  caption,
  fieldLabel,
  rows,
}: {
  caption: string;
  fieldLabel: string;
  rows: readonly FieldRow[];
}) {
  const columns: readonly DataColumn<KeyedRow>[] = [
    { key: "field", label: fieldLabel, width: 280, render: (row) => row.field },
    { key: "value", label: "Value", width: 824, render: (row) => row.value },
  ];
  return (
    <div className={styles.full}>
      <DataTable
        caption={caption}
        columns={columns}
        rows={rows.map((row) => ({ ...row, id: row.field }))}
      />
    </div>
  );
}
