import type { StageCatalog } from "./contracts";
import { prospectStageProgress } from "./overview";
import styles from "./prospects.module.css";

export function ProspectStageProgress({
  stage,
  catalog,
}: {
  stage: string;
  catalog: StageCatalog | null | undefined;
}) {
  const steps = prospectStageProgress(stage, catalog);
  if (!steps.length) return null;
  return (
    <ol className={styles.stageProgress} aria-label="Pipeline stage order">
      {steps.map((step) => (
        <li
          key={step.value}
          data-position={step.position}
          aria-current={step.position === "current" ? "step" : undefined}
        >
          <div className={styles.stageTrack} aria-hidden="true">
            <img
              src={`/design/411-64863-stage-${step.position}.svg`}
              alt=""
              width={14}
              height={14}
            />
            <span />
          </div>
          <span>{step.label}</span>
          {step.position === "current" && (
            <span className="srOnly">Current stage</span>
          )}
        </li>
      ))}
    </ol>
  );
}
