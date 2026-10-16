"use client";
import { DataTable, type DataColumn } from "./DataTable";
import styles from "./panel.module.css";

export type FieldRow = { label: string; value: string };
type KeyedRow = FieldRow & { id: string };

/** Two-column field/value record table for evidence, memory, action, receipt and configuration details. */
export function FieldTable({
  caption,
  fieldLabel,
  rows,
  shares = [280, 824],
}: {
  caption: string;
  fieldLabel: string;
  rows: readonly FieldRow[];
  /** Field and value column shares, matching the Figma column geometry. */
  shares?: readonly [number, number];
}) {
  const columns: readonly DataColumn<KeyedRow>[] = [
    {
      key: "field",
      label: fieldLabel,
      width: shares[0],
      render: (row) => row.label,
    },
    {
      key: "value",
      label: "Value",
      width: shares[1],
      render: (row) => row.value,
    },
  ];
  return (
    <div className={styles.full}>
      <DataTable
        caption={caption}
        columns={columns}
        rows={rows.map((row) => ({ ...row, id: row.label }))}
      />
    </div>
  );
}
