import type { WorkspaceBlueprintDefinition } from "@capiro/shared/workspace-template-studio";
import styles from "./studio-authoring.module.css";

export function BlueprintDefinitionRead({
  value,
}: {
  value: WorkspaceBlueprintDefinition;
}) {
  return (
    <div className={styles.read}>
      <h3>{value.documentType.label}</h3>
      <section
        className={styles.sectionList}
        aria-label="Saved blueprint sections"
        data-design-node="1064:261224"
      >
        <header>
          <h3>Blueprint sections</h3>
        </header>
        {value.sections.map((section) => (
          <div className={styles.section} key={section.id}>
            <strong>{section.title}</strong>
            <p>
              {section.required ? "Required" : "Optional"} ·{" "}
              {section.removable ? "Removable" : "Fixed"} ·{" "}
              {section.reorderable ? "Reorderable" : "Fixed order"}
              {section.lockedByDefault ? " · Locked by default" : ""}
            </p>
            <p>{section.purpose}</p>
            <p>{section.instructions}</p>
            <p>
              Target: {section.targetWords.min}–{section.targetWords.max} words
            </p>
            {section.evidenceRules.length > 0 && (
              <ul>
                {section.evidenceRules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
      <details>
        <summary>Intake questions · {value.intakeQuestions.length}</summary>
        {value.intakeQuestions.map((q) => (
          <div className={styles.section} key={q.id}>
            <strong>{q.label}</strong>
            <p>{q.helpText}</p>
            <p>
              {q.required ? "Required" : "Optional"} ·{" "}
              {q.answerSource.replaceAll("_", " ")}
            </p>
            {q.condition && (
              <p>
                When {q.condition.field}{" "}
                {q.condition.operator.replaceAll("_", " ")}
                {q.condition.value !== undefined
                  ? ` ${JSON.stringify(q.condition.value)}`
                  : ""}
              </p>
            )}
          </div>
        ))}
      </details>
      <details>
        <summary>Evidence and content rules</summary>
        <dl>
          <dt>Minimum sources</dt>
          <dd>{value.evidencePolicy.minimumSources}</dd>
          <dt>Prefer primary sources</dt>
          <dd>{value.evidencePolicy.primarySourcesPreferred ? "Yes" : "No"}</dd>
        </dl>
        <pre>
          {JSON.stringify(
            {
              citationsRequiredFor: value.evidencePolicy.citationRequiredFor,
              freshnessRules: value.evidencePolicy.freshnessRules,
              ...value.contentRules,
            },
            null,
            2,
          )}
        </pre>
      </details>
      <details>
        <summary>Embedded theme · {value.defaultTheme.name}</summary>
        <p>Settings stored with this blueprint version.</p>
        <pre>{JSON.stringify(value.defaultTheme.settings, null, 2)}</pre>
      </details>
    </div>
  );
}
