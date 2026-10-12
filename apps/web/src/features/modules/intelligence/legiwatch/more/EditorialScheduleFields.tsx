"use client";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { LocalSchedule } from "../monitoring/ScopeControls";
import type { EditorialConfig } from "./use-editorial-draft";
export function EditorialScheduleFields({
  config,
  patch,
}: {
  config: EditorialConfig;
  patch: (value: Partial<EditorialConfig>) => void;
}) {
  const value = config.schedule,
    change = (next: Partial<EditorialConfig["schedule"]>) =>
      patch({ schedule: { ...value, ...next } });
  return (
    <div className={styles.form}>
      <LocalSchedule
        timezone={value.timezone}
        localMinutes={value.hour * 60 + value.minute}
        onChange={(next) =>
          change({
            timezone: next.timezone ?? value.timezone,
            hour:
              next.localMinutes === undefined
                ? value.hour
                : Math.floor(next.localMinutes / 60),
            minute:
              next.localMinutes === undefined
                ? value.minute
                : next.localMinutes % 60,
          })
        }
      />
      <fieldset>
        <legend>Weekdays</legend>
        <div className={styles.actions}>
          {[
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ].map((day, index) => (
            <label className={styles.check} key={day}>
              <input
                type="checkbox"
                checked={value.weekdays.includes(index)}
                onChange={(event) =>
                  change({
                    weekdays: event.target.checked
                      ? [...value.weekdays, index]
                      : value.weekdays.filter((item) => item !== index),
                  })
                }
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>
      <SelectField
        id="editorial-no-change"
        label="When there are no changes"
        value={value.noChange}
        onChange={(next) =>
          change({ noChange: next === "skip" ? next : "draft" })
        }
      >
        <option value="draft">Prepare a draft</option>
        <option value="skip">Skip the edition</option>
      </SelectField>
      <SelectField
        id="editorial-source-gap"
        label="When source coverage is incomplete"
        value={value.sourceGap}
        onChange={(next) =>
          change({ sourceGap: next === "draft" ? next : "hold" })
        }
      >
        <option value="hold">Hold for review</option>
        <option value="draft">Prepare a draft with source gaps</option>
      </SelectField>
    </div>
  );
}
