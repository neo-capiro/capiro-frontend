"use client";

import {
  variableFields,
  type OutreachTemplateSpec,
} from "../../../../shared/capiro/operations/outreach-template-schemas";
import {
  ActionButton,
  Field,
  SelectInput,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { templateFieldLabels } from "./template-model";

type Variable = OutreachTemplateSpec["variables"][number];
export function TemplateVariables({
  variables,
  onChange,
}: {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
}) {
  function update(index: number, patch: Partial<Variable>) {
    onChange(
      variables.map((variable, position) =>
        position === index ? { ...variable, ...patch } : variable,
      ),
    );
  }
  function add() {
    onChange([
      ...variables,
      {
        key: `question_${variables.length + 1}`,
        label: "",
        question: null,
        type: "text",
        choices: null,
        required: false,
        defaultValue: null,
        resolutionPolicy: "always_ask",
        scope: "public",
        appliesTo: [],
      },
    ]);
  }
  return (
    <div className={styles.form}>
      <p className={styles.footnote}>
        Typed variables like {"{client}"}, {"{amount}"} or {"{deadline}"} can
        appear in a template’s goal, topic, desired outcome and ask.
      </p>
      {variables.map((variable, index) => (
        <section key={index} className={styles.variable}>
          <header>
            <TextInput
              aria-label={`Variable ${index + 1} key`}
              value={variable.key}
              maxLength={40}
              onChange={(event) => update(index, { key: event.target.value })}
            />
            <TextInput
              aria-label={`Variable ${index + 1} label`}
              value={variable.label}
              maxLength={120}
              placeholder="Question label"
              onChange={(event) => update(index, { label: event.target.value })}
            />
            <ActionButton
              onClick={() =>
                onChange(variables.filter((_, position) => position !== index))
              }
            >
              Remove
            </ActionButton>
          </header>
          <div className={styles.grid}>
            <Field label="Type" htmlFor={`template-variable-type-${index}`}>
              <SelectInput
                id={`template-variable-type-${index}`}
                value={variable.type}
                onValueChange={(value) =>
                  update(index, {
                    type: value as Variable["type"],
                    choices: value === "choice" ? [""] : null,
                  })
                }
                options={[
                  "text",
                  "number",
                  "date",
                  "url",
                  "email",
                  "choice",
                ].map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field
              label="Resolution"
              htmlFor={`template-variable-resolution-${index}`}
            >
              <SelectInput
                id={`template-variable-resolution-${index}`}
                value={variable.resolutionPolicy}
                onValueChange={(value) =>
                  update(index, {
                    resolutionPolicy: value as Variable["resolutionPolicy"],
                    defaultValue:
                      value === "always_ask" ? null : variable.defaultValue,
                  })
                }
                options={[
                  { value: "always_ask", label: "Always ask" },
                  { value: "user_must_confirm", label: "User must confirm" },
                  { value: "meri_can_determine", label: "Meri can determine" },
                ]}
              />
            </Field>
            <Field label="Scope" htmlFor={`template-variable-scope-${index}`}>
              <SelectInput
                id={`template-variable-scope-${index}`}
                value={variable.scope}
                onValueChange={(value) =>
                  update(index, { scope: value as Variable["scope"] })
                }
                options={[
                  { value: "public", label: "Public" },
                  {
                    value: "client_confidential",
                    label: "Client confidential",
                  },
                ]}
              />
            </Field>
            <Field
              label="Question"
              htmlFor={`template-variable-question-${index}`}
            >
              <TextInput
                id={`template-variable-question-${index}`}
                value={variable.question ?? ""}
                maxLength={500}
                onChange={(event) =>
                  update(index, { question: event.target.value || null })
                }
              />
            </Field>
          </div>
          {variable.type === "choice" && (
            <Field
              label="Choices, one per comma"
              htmlFor={`template-variable-choices-${index}`}
            >
              <TextInput
                id={`template-variable-choices-${index}`}
                value={variable.choices?.join(", ") ?? ""}
                onChange={(event) =>
                  update(index, {
                    choices: event.target.value
                      .split(",")
                      .map((value) => value.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          )}
          {variable.resolutionPolicy !== "always_ask" && (
            <Field
              label="Default value"
              htmlFor={`template-variable-default-${index}`}
            >
              <TextInput
                id={`template-variable-default-${index}`}
                value={variable.defaultValue ?? ""}
                maxLength={500}
                onChange={(event) =>
                  update(index, { defaultValue: event.target.value || null })
                }
              />
            </Field>
          )}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={variable.required}
              onChange={(event) =>
                update(index, { required: event.target.checked })
              }
            />
            Required
          </label>
          <strong className={styles.footnote}>APPEARS IN</strong>
          <div className={styles.actions}>
            {variableFields.map((field) => (
              <label key={field} className={styles.check}>
                <input
                  type="checkbox"
                  checked={variable.appliesTo.includes(field)}
                  onChange={(event) =>
                    update(index, {
                      appliesTo: event.target.checked
                        ? [...variable.appliesTo, field]
                        : variable.appliesTo.filter((value) => value !== field),
                    })
                  }
                />
                {templateFieldLabels[field]}
              </label>
            ))}
          </div>
        </section>
      ))}
      <ActionButton disabled={variables.length >= 20} onClick={add}>
        + Add variable
      </ActionButton>
    </div>
  );
}
