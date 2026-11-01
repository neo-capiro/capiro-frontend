"use client";
import { ActionButton } from "../../../../shared/module-ui";
import type { useProcurementSelection } from "./useProcurementSelection";
import styles from "./procurement.module.css";

export function ProcurementSelection({
  selection,
}: {
  selection: ReturnType<typeof useProcurementSelection>;
}) {
  return (
    <div className={styles.selection}>
      <p>
        Select up to 25 award records to see their qualified procurement
        actions. Selection stays across search pages. Related awards are not
        added automatically.
      </p>
      <div className={styles.actions}>
        <strong>{selection.keys.length} of 25 awards selected</strong>
        <ActionButton
          disabled={
            selection.pending || (!selection.keys.length && !selection.error)
          }
          onClick={selection.clear}
        >
          Clear selection
        </ActionButton>
      </div>
      {selection.pending && <p role="status">Updating award selection…</p>}
      {selection.error && <p role="alert">{selection.error}</p>}
      {selection.keys.length > 0 && (
        <details>
          <summary>Review selected awards</summary>
          <ul className={styles.selected}>
            {selection.keys.map((key) => (
              <li key={key}>
                <code>{key}</code>
                <ActionButton
                  disabled={selection.pending}
                  aria-label={`Remove ${key}`}
                  onClick={() => selection.remove(key)}
                >
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
