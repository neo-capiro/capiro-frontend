import { SelectField } from "@/shared/portfolio/ui/SelectField";
import { hasVerifiedDraftPhone, type AlertDraft } from "./contracts";
import type { PersonalPreferences } from "./personal-contracts";
import type { PreferenceFieldsProps } from "./AlertCriteria";
import styles from "./preferences.module.css";

export function AlertDelivery({
  draft,
  record,
  onChange,
  phoneLimit = 32,
  strictEmail = true,
}: PreferenceFieldsProps & {
  record: PersonalPreferences;
  phoneLimit?: number;
  strictEmail?: boolean;
}) {
  return (
    <div className={styles.delivery}>
      <section className={styles.channel} aria-label="Email delivery">
        <label className={styles.choice}>
          <input
            type="checkbox"
            checked={draft.emailEnabled}
            onChange={(event) =>
              onChange({ emailEnabled: event.target.checked })
            }
          />
          <span>Email alerts</span>
        </label>
        <label className={styles.field}>
          <span>Email address</span>
          <input
            type={strictEmail ? "email" : "text"}
            inputMode="email"
            maxLength={320}
            autoComplete="email"
            value={draft.emailAddress ?? ""}
            required={strictEmail && draft.emailEnabled}
            onChange={(event) =>
              onChange({ emailAddress: event.target.value || null })
            }
          />
        </label>
        <div className={styles.select}>
          <SelectField
            label="Email cadence"
            value={draft.emailCadence}
            onChange={(event) =>
              onChange({
                emailCadence: event.target.value as AlertDraft["emailCadence"],
              })
            }
          >
            <option value="realtime">Real time</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
          </SelectField>
        </div>
      </section>
      <section className={styles.channel} aria-label="SMS delivery">
        <label className={styles.choice}>
          <input
            type="checkbox"
            checked={draft.smsEnabled}
            onChange={(event) => onChange({ smsEnabled: event.target.checked })}
          />
          <span>SMS alerts</span>
        </label>
        <label className={styles.field}>
          <span>Phone number</span>
          <input
            type="tel"
            maxLength={phoneLimit}
            autoComplete="tel"
            placeholder="Add phone number"
            aria-describedby="alert-phone-verification"
            value={draft.smsPhone ?? ""}
            onChange={(event) =>
              onChange({ smsPhone: event.target.value || null })
            }
          />
        </label>
        <div className={styles.select}>
          <SelectField
            label="SMS cadence"
            value={draft.smsCadence}
            onChange={(event) =>
              onChange({
                smsCadence: event.target.value as AlertDraft["smsCadence"],
              })
            }
          >
            <option value="realtime">Real time</option>
            <option value="daily">Daily digest</option>
          </SelectField>
        </div>
        <p className={styles.help} id="alert-phone-verification" role="status">
          {hasVerifiedDraftPhone(record, draft)
            ? "Phone verification confirmed by the service."
            : "Phone verification required before SMS delivery."}
        </p>
      </section>
    </div>
  );
}

export function AlertQuietHours({ draft, onChange }: PreferenceFieldsProps) {
  return (
    <section className={styles.quiet} aria-labelledby="alert-quiet-title">
      <h3 id="alert-quiet-title">Quiet hours</h3>
      <div className={styles.quietInputs}>
        <label className={styles.field}>
          <span>Start (HH:MM)</span>
          <input
            value={draft.quietHoursStart ?? ""}
            maxLength={5}
            inputMode="text"
            aria-describedby="alert-quiet-help"
            onChange={(event) =>
              onChange({ quietHoursStart: event.target.value || null })
            }
          />
        </label>
        <label className={styles.field}>
          <span>End (HH:MM)</span>
          <input
            value={draft.quietHoursEnd ?? ""}
            maxLength={5}
            inputMode="text"
            aria-describedby="alert-quiet-help"
            onChange={(event) =>
              onChange({ quietHoursEnd: event.target.value || null })
            }
          />
        </label>
      </div>
      <p className={styles.help} id="alert-quiet-help">
        Optional. Clear both fields to remove quiet hours.
      </p>
    </section>
  );
}
