"use client";
import { DataTable, type DataColumn } from "./DataTable";
import surfaces from "./surfaces.module.css";

export type FieldRow = { label: string; value: string };
type Row = FieldRow & { id: string };

/** Two-column field/value record table (evidence, memory and governance fields). */
export function FieldTable({
  caption,
  fieldLabel,
  rows,
  shares,
}: {
  caption: string;
  fieldLabel: string;
  rows: readonly FieldRow[];
  /** Field and value column shares, matching the Figma column geometry. */
  shares: readonly [number, number];
}) {
  const columns: readonly DataColumn<Row>[] = [
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
    <div className={surfaces.stretch}>
      <DataTable
        caption={caption}
        columns={columns}
        rows={rows.map((row) => ({ ...row, id: row.label }))}
      />
    </div>
  );
}
