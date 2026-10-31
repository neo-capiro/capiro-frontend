"use client";
import styles from "../legiwatch.module.css";
import type { EditorialConfig } from "./use-editorial-draft";

export function EditorialSourceFields({
  config,
  patch,
}: {
  config: EditorialConfig;
  patch: (value: Partial<EditorialConfig>) => void;
}) {
  return (
    <div className={styles.form}>
      <p className={styles.description}>
        Briefings use retained research sources in the selected folder.
      </p>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={config.dictionaryScopeAccepted}
          onChange={(event) =>
            patch({ dictionaryScopeAccepted: event.target.checked })
          }
        />
        I reviewed the selected research source scope.
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={config.acceptAvailableFields}
          onChange={(event) =>
            patch({ acceptAvailableFields: event.target.checked })
          }
        />
        Use the available retained source fields and keep completeness gaps
        visible.
      </label>
    </div>
  );
}
