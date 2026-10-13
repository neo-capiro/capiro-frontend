import { SelectField } from "@/shared/portfolio/ui/SelectField";
import { alertTriggers, triggerLabels, type AlertDraft } from "./contracts";
import styles from "./preferences.module.css";

export type PreferenceFieldsProps = {
  draft: AlertDraft;
  onChange: (patch: Partial<AlertDraft>) => void;
};
export function AlertCriteria({
  draft,
  onChange,
  showJurisdictions = true,
}: PreferenceFieldsProps & { showJurisdictions?: boolean }) {
  return (
    <section className={styles.criteria}>
      <fieldset className={styles.triggers}>
        <legend>Notify me about</legend>
        <div className={styles.triggerGrid}>
          {alertTriggers.map((trigger) => (
            <label className={styles.choice} key={trigger}>
              <input
                type="checkbox"
                checked={draft.triggers.includes(trigger)}
                onChange={(event) =>
                  onChange({
                    triggers: event.target.checked
                      ? [...draft.triggers, trigger]
                      : draft.triggers.filter((value) => value !== trigger),
                  })
                }
              />
              <span>{triggerLabels[trigger]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.filters}>
        <div className={styles.select}>
          <SelectField
            label="Minimum importance"
            value={draft.materiality}
            onChange={(event) =>
              onChange({
                materiality: event.target.value as AlertDraft["materiality"],
              })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </SelectField>
        </div>
        {showJurisdictions && (
          <label className={styles.field}>
            <span>Jurisdictions</span>
            <input
              value={draft.jurisdictionsText}
              autoComplete="off"
              aria-describedby="alert-jurisdiction-help"
              onChange={(event) =>
                onChange({ jurisdictionsText: event.target.value })
              }
            />
            <small id="alert-jurisdiction-help">
              Leave blank to include all jurisdictions.
            </small>
          </label>
        )}
      </div>
    </section>
  );
}
