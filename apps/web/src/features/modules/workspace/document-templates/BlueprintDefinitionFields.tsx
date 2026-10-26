"use client";
import { useId, useState } from "react";
import type {
  IntakeQuestion,
  WorkspaceBlueprintDefinition,
} from "@capiro/shared/workspace-template-studio";
import {
  ActionButton,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import {
  BlueprintSectionFields,
  StudioLines,
  StudioNumber,
  StudioText,
  StudioToggle,
} from "./BlueprintSectionFields";
import styles from "./studio-authoring.module.css";
import { BlueprintThemePicker } from "./BlueprintThemePicker";
import { sameStudioValue } from "./studio-write";

/** Settings and conditional values have no narrower producer schema. Keep the
 * complete JSON value; never coerce unknown theme keys to invented controls. */
export function StudioJson({
  label,
  value,
  onChange,
  objectOnly = false,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  objectOnly?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState(false);
  const [observed, setObserved] = useState(value);
  if (!sameStudioValue(observed, value)) {
    setObserved(value);
    setText(JSON.stringify(value, null, 2));
    setError(false);
  }
  return (
    <Field label={label} htmlFor={id}>
      <TextArea
        id={id}
        ref={(node) => {
          node?.setCustomValidity(
            error
              ? objectOnly
                ? "Enter a JSON object."
                : "Enter valid JSON."
              : "",
          );
        }}
        value={text}
        aria-invalid={error}
        rows={6}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          try {
            const parsed: unknown = JSON.parse(next, (_key, value: unknown) => {
              if (typeof value === "number" && !Number.isFinite(value))
                throw new Error();
              return value;
            });
            if (
              objectOnly &&
              (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            )
              throw new Error();
            setError(false);
            setObserved(parsed);
            onChange(parsed);
          } catch {
            setError(true);
          }
        }}
      />
      {error && (
        <span role="alert">
          {objectOnly ? "Enter a valid JSON object." : "Enter valid JSON."}
        </span>
      )}
    </Field>
  );
}

function IntakeFields({
  questions,
  onChange,
}: {
  questions: IntakeQuestion[];
  onChange: (value: IntakeQuestion[]) => void;
}) {
  const change = (index: number, row: IntakeQuestion) =>
    onChange(questions.map((value, at) => (at === index ? row : value)));
  return (
    <div className={styles.fields}>
      {questions.map((row, index) => (
        <fieldset className={styles.group} key={index}>
          <legend>Question {index + 1}</legend>
          <StudioText
            label="Question identifier"
            value={row.id}
            onChange={(id) => change(index, { ...row, id })}
          />
          <StudioText
            label="Question label"
            value={row.label}
            onChange={(label) => change(index, { ...row, label })}
          />
          <StudioText
            label="Help text"
            value={row.helpText ?? ""}
            onChange={(helpText) => change(index, { ...row, helpText })}
          />
          <Field label="Answer source">
            <SelectInput
              aria-label={`Answer source ${index + 1}`}
              value={row.answerSource}
              options={[
                "user",
                "client_profile",
                "context",
                "meri_recommendation",
              ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
              onValueChange={(answerSource) =>
                change(index, {
                  ...row,
                  answerSource: answerSource as IntakeQuestion["answerSource"],
                })
              }
            />
          </Field>
          <StudioToggle
            label={`Required question ${index + 1}`}
            value={row.required}
            onChange={(required) => change(index, { ...row, required })}
          />
          <Field label="Display condition">
            <SelectInput
              aria-label={`Display condition ${index + 1}`}
              value={row.condition?.operator ?? "none"}
              options={["none", "equals", "not_equals", "present"].map(
                (value) => ({ value, label: value.replaceAll("_", " ") }),
              )}
              onValueChange={(operator) => {
                const next = { ...row };
                if (operator === "none") delete next.condition;
                else
                  next.condition = {
                    field: row.condition?.field ?? "",
                    operator: operator as "equals" | "not_equals" | "present",
                    ...(row.condition?.value !== undefined
                      ? { value: row.condition.value }
                      : {}),
                  };
                change(index, next);
              }}
            />
          </Field>
          {row.condition && (
            <>
              <StudioText
                label="Condition field"
                value={row.condition.field}
                onChange={(field) =>
                  change(index, {
                    ...row,
                    condition: { ...row.condition!, field },
                  })
                }
              />
              {row.condition.operator !== "present" && (
                <StudioJson
                  label="Condition value (JSON)"
                  value={row.condition.value ?? null}
                  onChange={(value) =>
                    change(index, {
                      ...row,
                      condition: { ...row.condition!, value },
                    })
                  }
                />
              )}
            </>
          )}
          <ActionButton
            onClick={() => onChange(questions.filter((_, at) => at !== index))}
          >
            Remove question {index + 1}
          </ActionButton>
        </fieldset>
      ))}
      <ActionButton
        onClick={() =>
          onChange([
            ...questions,
            {
              id: `question-${crypto.randomUUID()}`,
              label: "New question",
              required: false,
              answerSource: "user",
            },
          ])
        }
      >
        Add intake question
      </ActionButton>
    </div>
  );
}

function PolicyFields({
  value,
  onChange,
}: {
  value: WorkspaceBlueprintDefinition;
  onChange: (value: WorkspaceBlueprintDefinition) => void;
}) {
  const evidence = value.evidencePolicy;
  const setEvidence = (patch: Partial<typeof evidence>) =>
    onChange({ ...value, evidencePolicy: { ...evidence, ...patch } });
  return (
    <div className={styles.fields}>
      <StudioNumber
        label="Minimum sources"
        value={evidence.minimumSources}
        onChange={(minimumSources) => setEvidence({ minimumSources })}
      />
      <StudioToggle
        label="Prefer primary sources"
        value={evidence.primarySourcesPreferred}
        onChange={(primarySourcesPreferred) =>
          setEvidence({ primarySourcesPreferred })
        }
      />
      <StudioLines
        label="Citations required for"
        value={evidence.citationRequiredFor}
        onChange={(citationRequiredFor) => setEvidence({ citationRequiredFor })}
      />
      {evidence.freshnessRules.map((row, index) => (
        <fieldset className={styles.group} key={index}>
          <legend>Freshness rule {index + 1}</legend>
          <StudioText
            label="Source type"
            value={row.sourceType}
            onChange={(sourceType) =>
              setEvidence({
                freshnessRules: evidence.freshnessRules.map((old, at) =>
                  at === index ? { ...row, sourceType } : old,
                ),
              })
            }
          />
          <Field
            label="Maximum age in days (blank for no limit)"
            htmlFor={`freshness-age-${index}`}
          >
            <TextInput
              id={`freshness-age-${index}`}
              type="number"
              min={0}
              step={1}
              value={row.maximumAgeDays ?? ""}
              onChange={(event) => {
                const next = { ...row };
                if (event.target.value === "") delete next.maximumAgeDays;
                else next.maximumAgeDays = event.target.valueAsNumber;
                setEvidence({
                  freshnessRules: evidence.freshnessRules.map((old, at) =>
                    at === index ? next : old,
                  ),
                });
              }}
            />
          </Field>
          <StudioToggle
            label={`Current cycle required ${index + 1}`}
            value={row.currentCycleRequired ?? false}
            onChange={(currentCycleRequired) =>
              setEvidence({
                freshnessRules: evidence.freshnessRules.map((old, at) =>
                  at === index ? { ...row, currentCycleRequired } : old,
                ),
              })
            }
          />
          <ActionButton
            onClick={() =>
              setEvidence({
                freshnessRules: evidence.freshnessRules.filter(
                  (_, at) => at !== index,
                ),
              })
            }
          >
            Remove freshness rule {index + 1}
          </ActionButton>
        </fieldset>
      ))}
      <ActionButton
        onClick={() =>
          setEvidence({
            freshnessRules: [
              ...evidence.freshnessRules,
              { sourceType: "", maximumAgeDays: 365 },
            ],
          })
        }
      >
        Add freshness rule
      </ActionButton>
      {(
        [
          ["requiredTerms", "Required terms"],
          ["prohibitedTerms", "Prohibited terms"],
          ["requiredDisclaimers", "Required disclaimers"],
          ["instructions", "Content instructions"],
        ] as const
      ).map(([key, label]) => (
        <StudioLines
          key={key}
          label={label}
          value={value.contentRules[key]}
          onChange={(next) =>
            onChange({
              ...value,
              contentRules: { ...value.contentRules, [key]: next },
            })
          }
        />
      ))}
    </div>
  );
}

export function BlueprintDefinitionFields({
  value,
  onChange,
}: {
  value: WorkspaceBlueprintDefinition;
  onChange: (value: WorkspaceBlueprintDefinition) => void;
}) {
  const [themeCopy, setThemeCopy] = useState(0);
  return (
    <div className={styles.fields}>
      <fieldset className={styles.group}>
        <legend>Document type</legend>
        <StudioText
          label="Document type identifier"
          value={value.documentType.id}
          onChange={(id) =>
            onChange({ ...value, documentType: { ...value.documentType, id } })
          }
        />
        <StudioText
          label="Document type label"
          value={value.documentType.label}
          onChange={(label) =>
            onChange({
              ...value,
              documentType: { ...value.documentType, label },
            })
          }
        />
        <StudioText
          label="Document product"
          value={value.documentType.product}
          onChange={(product) =>
            onChange({
              ...value,
              documentType: { ...value.documentType, product },
            })
          }
        />
      </fieldset>
      <BlueprintSectionFields
        sections={value.sections}
        onChange={(sections) => onChange({ ...value, sections })}
      />
      <details className={styles.group}>
        <summary>Intake questions</summary>
        <IntakeFields
          questions={value.intakeQuestions}
          onChange={(intakeQuestions) =>
            onChange({ ...value, intakeQuestions })
          }
        />
      </details>
      <details className={styles.group}>
        <summary>Evidence and content rules</summary>
        <PolicyFields value={value} onChange={onChange} />
      </details>
      <details className={styles.group}>
        <summary>Embedded default theme</summary>
        <div className={styles.fields}>
          <p>These settings are stored inside this blueprint definition.</p>
          <StudioText
            label="Default theme identifier"
            value={value.defaultTheme.id}
            onChange={(id) =>
              onChange({
                ...value,
                defaultTheme: { ...value.defaultTheme, id },
              })
            }
          />
          <StudioText
            label="Default theme name"
            value={value.defaultTheme.name}
            onChange={(name) =>
              onChange({
                ...value,
                defaultTheme: { ...value.defaultTheme, name },
              })
            }
          />
          <StudioJson
            key={themeCopy}
            label="Default theme settings (JSON)"
            value={value.defaultTheme.settings}
            objectOnly
            onChange={(settings) =>
              onChange({
                ...value,
                defaultTheme: {
                  ...value.defaultTheme,
                  settings: settings as Record<string, unknown>,
                },
              })
            }
          />
          <BlueprintThemePicker
            onChoose={(defaultTheme) => {
              setThemeCopy((current) => current + 1);
              onChange({ ...value, defaultTheme });
            }}
          />
        </div>
      </details>
    </div>
  );
}
