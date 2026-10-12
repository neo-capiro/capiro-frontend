"use client";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import { maturity, type Capability } from "./contracts";
import styles from "./capability-editor.module.css";

export function CapabilityIdentityFields({
  capability,
}: {
  capability?: Capability;
}) {
  return (
    <>
      <label>
        Name
        <input
          name="name"
          required
          defaultValue={capability?.name}
          maxLength={300}
          placeholder="Specific capability name"
        />
      </label>
      <div className={`formGrid ${styles.typeSector}`}>
        <label>
          Type
          <input
            name="type"
            defaultValue={capability?.type ?? "product"}
            maxLength={120}
          />
        </label>
        <label>
          Sector
          <input
            name="sector"
            defaultValue={capability?.sector ?? ""}
            maxLength={120}
          />
        </label>
      </div>
    </>
  );
}

export function CapabilityDetails({ capability }: { capability?: Capability }) {
  return (
    <details
      className={styles.details}
      onInvalid={(event) => {
        event.currentTarget.open = true;
      }}
    >
      <summary>{capability ? "Details" : "Additional details"}</summary>
      <div className={styles.detailFields}>
        {capability && <CapabilityIdentityFields capability={capability} />}
        <label>
          Manufacturing Readiness Level
          <select name="mrl" defaultValue={capability?.mrl ?? ""}>
            <option value="">Not set</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        {!capability && (
          <TextareaField
            label="Notes"
            name="notes"
            defaultValue=""
            maxLength={20000}
            placeholder="Internal notes…"
          />
        )}
      </div>
    </details>
  );
}

export function CapabilityReadiness({
  trl,
  onChange,
}: {
  trl: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div
      className={styles.readiness}
      role="group"
      aria-label="Technology Readiness Level"
    >
      <div className={styles.readinessHeading}>
        <span>Technology Readiness Level</span>
        <span className={styles.readinessStatus}>
          <span aria-live="polite">
            {trl === null
              ? "Not set, optional"
              : `TRL ${trl} · ${maturity(trl)}`}
          </span>
          {trl !== null && (
            <button
              type="button"
              className={styles.clear}
              onClick={() => onChange(null)}
            >
              Clear TRL
            </button>
          )}
        </span>
      </div>
      <div className={styles.levels}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => (
          <button
            type="button"
            key={level}
            className={`button ${styles.level} ${trl !== null && level <= trl ? "primary" : ""}`}
            aria-label={`TRL ${level}`}
            aria-pressed={trl === level}
            onClick={() => onChange(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
