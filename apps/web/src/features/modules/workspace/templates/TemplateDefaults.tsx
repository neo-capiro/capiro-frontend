"use client";
import {
  defaultPolicyFields,
  resolutionModes,
  type OutreachTemplateSpec,
} from "../../../../shared/capiro/operations/outreach-template-schemas";
import { Field, SelectInput, TextInput } from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { templateFieldLabels } from "./template-model";
export function SpecDefaults({
  spec,
  onChange,
}: {
  spec: OutreachTemplateSpec;
  onChange: (spec: OutreachTemplateSpec) => void;
}) {
  const fields = [
    "goal",
    "objective",
    "topic",
    "desiredOutcome",
    "ask",
    "whyNow",
  ] as const;
  return (
    <div className={styles.form}>
      {fields.map((field) => (
        <div className={styles.variable} key={field}>
          <div className={styles.heading}>
            <label htmlFor={`template-default-${field}`}>
              {templateFieldLabels[field]}
            </label>
            <SelectInput
              aria-label={`${templateFieldLabels[field]} resolution policy`}
              value={spec.defaultsPolicy[field]}
              onValueChange={(value) =>
                onChange({
                  ...spec,
                  defaultsPolicy: {
                    ...spec.defaultsPolicy,
                    [field]:
                      value as OutreachTemplateSpec["defaultsPolicy"][typeof field],
                  },
                })
              }
              options={resolutionModes.map((value) => ({
                value,
                label: value.replaceAll("_", " "),
              }))}
            />
          </div>
          <TextInput
            id={`template-default-${field}`}
            value={
              (field === "ask" ? spec.goal.ask.text : spec.goal[field]) ?? ""
            }
            onChange={(event) =>
              onChange({
                ...spec,
                goal: {
                  ...spec.goal,
                  [field]:
                    field === "ask"
                      ? {
                          mode: event.target.value.trim()
                            ? "explicit"
                            : "undecided",
                          text: event.target.value || null,
                        }
                      : event.target.value || null,
                },
              })
            }
          />
        </div>
      ))}
      <div className={styles.grid}>
        <Field label="Delivery pattern" htmlFor="template-delivery-pattern">
          <SelectInput
            id="template-delivery-pattern"
            value={spec.delivery.pattern}
            onValueChange={(value) =>
              onChange({
                ...spec,
                delivery: {
                  ...spec.delivery,
                  pattern: value as OutreachTemplateSpec["delivery"]["pattern"],
                },
              })
            }
            options={[
              "undecided",
              "personalized_separate",
              "uniform_separate",
              "shared_thread",
            ].map((value) => ({ value, label: value.replaceAll("_", " ") }))}
          />
        </Field>
        <Field label="Personalization" htmlFor="template-personalization">
          <SelectInput
            id="template-personalization"
            value={spec.delivery.personalization}
            onValueChange={(value) =>
              onChange({
                ...spec,
                delivery: {
                  ...spec.delivery,
                  personalization:
                    value as OutreachTemplateSpec["delivery"]["personalization"],
                },
              })
            }
            options={["undecided", "high", "light", "none"].map((value) => ({
              value,
              label: value,
            }))}
          />
        </Field>
        <Field label="Tone" htmlFor="template-tone">
          <TextInput
            id="template-tone"
            value={spec.strategy.tone ?? ""}
            maxLength={120}
            onChange={(event) =>
              onChange({
                ...spec,
                strategy: {
                  ...spec.strategy,
                  tone: event.target.value || null,
                },
              })
            }
          />
        </Field>
        <Field label="Length" htmlFor="template-length">
          <SelectInput
            id="template-length"
            value={spec.strategy.length}
            onValueChange={(value) =>
              onChange({
                ...spec,
                strategy: {
                  ...spec.strategy,
                  length: value as OutreachTemplateSpec["strategy"]["length"],
                  customLengthInstruction:
                    value === "custom"
                      ? spec.strategy.customLengthInstruction
                      : null,
                },
              })
            }
            options={["undecided", "short", "medium", "long", "custom"].map(
              (value) => ({ value, label: value }),
            )}
          />
        </Field>
      </div>
      {spec.strategy.length === "custom" && (
        <Field
          label="Custom length instruction"
          htmlFor="template-custom-length"
        >
          <TextInput
            id="template-custom-length"
            value={spec.strategy.customLengthInstruction ?? ""}
            maxLength={1000}
            onChange={(event) =>
              onChange({
                ...spec,
                strategy: {
                  ...spec.strategy,
                  customLengthInstruction: event.target.value || null,
                },
              })
            }
          />
        </Field>
      )}
      <details>
        <summary>More defaults and guidance</summary>
        <div className={styles.form}>
          {Object.entries(spec.guidance).map(([field, value]) => (
            <Field
              key={field}
              label={field.replace(/([A-Z])/g, " $1")}
              htmlFor={`template-guidance-${field}`}
            >
              <TextInput
                id={`template-guidance-${field}`}
                value={value ?? ""}
                onChange={(event) =>
                  onChange({
                    ...spec,
                    guidance: {
                      ...spec.guidance,
                      [field]: event.target.value || null,
                    },
                  })
                }
              />
            </Field>
          ))}
          {defaultPolicyFields.slice(6).map((field) => (
            <Field
              key={field}
              label={`${templateFieldLabels[field]} policy`}
              htmlFor={`template-policy-${field}`}
            >
              <SelectInput
                id={`template-policy-${field}`}
                value={spec.defaultsPolicy[field]}
                onValueChange={(value) =>
                  onChange({
                    ...spec,
                    defaultsPolicy: {
                      ...spec.defaultsPolicy,
                      [field]:
                        value as OutreachTemplateSpec["defaultsPolicy"][typeof field],
                    },
                  })
                }
                options={resolutionModes.map((value) => ({
                  value,
                  label: value.replaceAll("_", " "),
                }))}
              />
            </Field>
          ))}
        </div>
      </details>
    </div>
  );
}
