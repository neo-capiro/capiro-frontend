"use client";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { Field, StatusPanel, TextInput } from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import type { EditorialConfig, EditorialRow } from "./use-editorial-draft";
export function EditorialSourceFields({
  row,
  config,
  patch,
}: {
  row: EditorialRow;
  config: EditorialConfig;
  patch: (value: Partial<EditorialConfig>) => void;
}) {
  const monitors = useCapiroQuery("legiwatch.evidence.monitors", {});
  return (
    <div className={styles.form}>
      <fieldset className={styles.form}>
        <legend>Source kinds</legend>
        {(["news", "budget", "personnel", "research"] as const).map((kind) => (
          <label className={styles.check} key={kind}>
            <input
              type="checkbox"
              checked={config.includedKinds.includes(kind)}
              onChange={(event) =>
                patch({
                  includedKinds: event.target.checked
                    ? [...config.includedKinds, kind]
                    : config.includedKinds.filter((item) => item !== kind),
                  dictionaryScopeAccepted: false,
                })
              }
            />
            {kind}
          </label>
        ))}
      </fieldset>
      <StatusPanel
        loading={monitors.loading}
        error={monitors.error}
        onRetry={monitors.reload}
      >
        <fieldset className={styles.form}>
          <legend>Reviewed news monitors</legend>
          {monitors.data?.monitors
            .filter(
              (monitor) =>
                (monitor.config.clientId ?? undefined) === config.clientId,
            )
            .map((monitor) => (
              <label className={styles.check} key={monitor.id}>
                <input
                  type="checkbox"
                  checked={config.monitorIds.includes(monitor.id)}
                  onChange={(event) =>
                    patch({
                      monitorIds: event.target.checked
                        ? [...config.monitorIds, monitor.id]
                        : config.monitorIds.filter((id) => id !== monitor.id),
                      dictionaryScopeAccepted: false,
                    })
                  }
                />
                {monitor.config.name ?? monitor.source?.raw ?? monitor.id}
              </label>
            ))}
        </fieldset>
      </StatusPanel>
      {row.source.family.categories.map((id) => {
        const entry = config.categoryMapping.entries[id] ?? {
          decision: "pending" as const,
          reason: "Pending review",
        };
        const update = (next: Partial<typeof entry>) =>
          patch({
            categoryMapping: {
              ...config.categoryMapping,
              entries: {
                ...config.categoryMapping.entries,
                [id]: { ...entry, ...next },
              },
            },
            dictionaryScopeAccepted: false,
          });
        return (
          <div className={styles.form} key={id}>
            <SelectField
              id={`category-${id}`}
              label={`Captured category ${id} · ${row.source.family.categoryNamespace}`}
              value={entry.decision}
              onChange={(value) =>
                update({
                  decision:
                    value === "included" || value === "excluded"
                      ? value
                      : "pending",
                })
              }
            >
              <option value="pending">Pending review</option>
              <option value="included">Include</option>
              <option value="excluded">Exclude</option>
            </SelectField>
            <Field
              label={`Reason for category ${id}`}
              htmlFor={`category-reason-${id}`}
            >
              <TextInput
                id={`category-reason-${id}`}
                value={entry.reason}
                maxLength={2000}
                onChange={(event) => update({ reason: event.target.value })}
              />
            </Field>
          </div>
        );
      })}
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={config.dictionaryScopeAccepted}
          onChange={(event) =>
            patch({ dictionaryScopeAccepted: event.target.checked })
          }
        />
        I reviewed the complete selected source and category scope.
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
