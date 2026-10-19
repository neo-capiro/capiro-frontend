import { useId } from "react";
import {
  objectiveReadiness,
  readinessFields,
  type ObjectiveFields,
} from "./contracts";
import styles from "./objectives.module.css";

/** Figma 411:60841, adapted to the confirmed four-field readiness rule. */
export function ObjectiveReadiness({ fields }: { fields: ObjectiveFields }) {
  const titleId = useId();
  const descriptionId = useId();
  const readiness = objectiveReadiness(fields);
  return (
    <section className={styles.readiness} aria-labelledby={titleId}>
      <header className={styles.readinessHeader}>
        <h3 id={titleId}>Readiness</h3>
        <span
          className={styles.readinessInfo}
          title="Complete these four fields before requesting review or confirming ready."
          aria-hidden="true"
        >
          i
        </span>
      </header>
      <p id={descriptionId} className="srOnly" role="status" aria-live="polite">
        {readiness.completedFields} of 4 required fields complete.
        {readiness.isReady
          ? " Ready for review or confirmation."
          : " Drafts can be saved at any time."}
      </p>
      <ul className={styles.readinessList} aria-describedby={descriptionId}>
        {readinessFields.map(([key, label]) => (
          <li key={key}>
            <span
              className={`${styles.readinessMark} ${readiness.checklist[key] ? styles.readinessComplete : ""}`}
              aria-hidden="true"
            >
              {readiness.checklist[key] ? "✓" : ""}
            </span>
            <span>{label}</span>
            <small>{readiness.checklist[key] ? "Done" : "Needed"}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
