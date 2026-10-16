"use client";
import type { KeyboardEvent } from "react";
import styles from "./previews.module.css";

export type SheetCell = { value: string; formula?: string };
export type CellPosition = { row: number; col: number };

export const cellReference = ({ row, col }: CellPosition) =>
  `${String.fromCharCode(65 + col)}${row + 1}`;

const steps: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Read-only workbook grid with single-cell selection and arrow-key navigation. */
export function SheetGrid({
  label,
  columns,
  rows,
  selected,
  onSelect,
}: {
  label: string;
  columns: readonly string[];
  rows: readonly (readonly SheetCell[])[];
  selected: CellPosition;
  onSelect: (position: CellPosition) => void;
}) {
  const move = (event: KeyboardEvent<HTMLTableElement>) => {
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const row = Math.min(rows.length - 1, Math.max(0, selected.row + step[0]));
    const col = Math.min(
      columns.length - 1,
      Math.max(0, selected.col + step[1]),
    );
    onSelect({ row, col });
    event.currentTarget
      .querySelector<HTMLElement>(`[data-cell="${row}-${col}"]`)
      ?.focus();
  };
  return (
    <div className={styles.sheetFrame}>
      <table
        className={styles.sheet}
        role="grid"
        aria-label={label}
        onKeyDown={move}
      >
        <colgroup>
          <col style={{ width: 50 }} />
          {columns.map((column, index) => (
            <col
              key={column}
              style={index === 0 ? { width: "36%" } : undefined}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Row</span>
            </th>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, row) => (
            <tr key={row}>
              <th scope="row">{row + 1}</th>
              {cells.map((cell, col) => {
                const isSelected = row === selected.row && col === selected.col;
                return (
                  <td
                    key={col}
                    role="gridcell"
                    className={styles.cell}
                    data-cell={`${row}-${col}`}
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => onSelect({ row, col })}
                  >
                    {cell.value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
