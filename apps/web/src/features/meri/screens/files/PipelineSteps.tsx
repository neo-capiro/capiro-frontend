import { Check, Clock } from "lucide-react";
import type { PipelineStep } from "./types";
import styles from "./files.module.css";

/** Revision pipeline steps (04.06 and the revision progress sheet): done steps check, pending steps wait. */
export function PipelineSteps({
  label,
  steps,
}: {
  label: string;
  steps: readonly PipelineStep[];
}) {
  return (
    <ol className={styles.steps} aria-label={label}>
      {steps.map((step) => (
        <li key={step.id} className={styles.step}>
          {step.done ? (
            <Check aria-hidden className={styles.rowIcon} />
          ) : (
            <Clock aria-hidden className={styles.rowIcon} />
          )}
          <div className={styles.rowCopy}>
            <p className={styles.rowTitle}>
              {step.title}
              <span className="sr-only">
                {step.done ? " · complete" : " · pending"}
              </span>
            </p>
            <p className={styles.rowDetail}>{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
