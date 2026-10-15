import type { DataColumn } from "./DataTable";
import type { StatusTone } from "./StatusPill";
import styles from "./phone-cards.module.css";

/** A column whose phone card value is drawn as Meri/Status in the given tone. */
export type PhoneStatusColumn<Row> = {
  key: string;
  tone: (row: Row) => StatusTone;
};

/**
 * Repeats each column label inside its cell for the phone card layout (phone-cards.module.css).
 * The repeated label is hidden from assistive technology; the table header keeps the semantics.
 */
export function phoneCardColumns<Row>(
  columns: readonly DataColumn<Row>[],
  status?: PhoneStatusColumn<Row>,
): readonly DataColumn<Row>[] {
  return columns.map((column) => ({
    ...column,
    render: (row: Row) => (
      <>
        <span className={styles.label} aria-hidden="true">
          {column.label}
        </span>
        {column.key === status?.key ? (
          <span className={styles.status} data-tone={status.tone(row)}>
            {column.render(row)}
          </span>
        ) : (
          column.render(row)
        )}
      </>
    ),
  }));
}
