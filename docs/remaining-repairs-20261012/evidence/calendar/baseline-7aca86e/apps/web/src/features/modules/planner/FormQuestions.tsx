"use client";
import { useState } from "react";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
  TextInput,
} from "../../../shared/module-ui";
import {
  changeQuestionType,
  formQuestions,
  type FormQuestion,
} from "./form-model";
import styles from "./planner.module.css";
export { formQuestions, type FormQuestion } from "./form-model";
export function FormQuestions({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const fields = formQuestions(data.fields);
  const setFields = (next: FormQuestion[]) =>
    onChange({ ...data, fields: next });
  const update = (id: string, key: string, value: unknown) =>
    setFields(
      fields.map((field) =>
        field.id === id
          ? key === "type"
            ? changeQuestionType(field, String(value))
            : { ...field, [key]: value }
          : field,
      ),
    );
  return (
    <div className={styles.stack}>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={Boolean(data.enabled)}
          onChange={(event) =>
            onChange({ ...data, enabled: event.target.checked })
          }
        />
        Accept submissions
      </label>
      <Field label="Form access" htmlFor="form-audience">
        <SelectInput
          id="form-audience"
          value={String(data.audience ?? "public")}
          onValueChange={(audience) => onChange({ ...data, audience })}
          options={[
            { value: "organization", label: "Firm members" },
            { value: "public", label: "Anyone with the link" },
          ]}
        />
      </Field>
      <Field label="Task title" htmlFor="form-task-title">
        <SelectInput
          id="form-task-title"
          value={
            data.titleFieldId === null
              ? "default"
              : String(data.titleFieldId ?? "mapped")
          }
          onValueChange={(value) =>
            onChange({
              ...data,
              titleFieldId:
                value === "default"
                  ? null
                  : value === "mapped"
                    ? undefined
                    : value,
            })
          }
          options={[
            { value: "mapped", label: "Required task name question" },
            {
              value: "default",
              label: "Use the form's default submission title",
            },
            ...fields
              .filter((field) => field.type !== "attachment")
              .map((field) => ({ value: field.id, label: field.label })),
          ]}
        />
      </Field>
      {fields.map((field, index) => (
        <Panel key={field.id} title={`Question ${index + 1}`}>
          <QuestionFields
            field={field}
            update={update}
            onRemove={() =>
              setFields(fields.filter((item) => item.id !== field.id))
            }
          />
        </Panel>
      ))}
      <ActionButton
        type="button"
        onClick={() =>
          setFields([
            ...fields,
            {
              id: crypto.randomUUID(),
              label: "New question",
              type: "text",
              required: false,
              options: [],
              taskField: null,
            },
          ])
        }
      >
        + Add question
      </ActionButton>
      <Field label="Confirmation message" htmlFor="form-confirmation">
        <TextInput
          id="form-confirmation"
          value={String(data.confirmationMessage ?? "")}
          onChange={(event) =>
            onChange({ ...data, confirmationMessage: event.target.value })
          }
        />
      </Field>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={Boolean(data.allowAnotherSubmission)}
          onChange={(event) =>
            onChange({ ...data, allowAnotherSubmission: event.target.checked })
          }
        />
        Allow another submission
      </label>
    </div>
  );
}

function QuestionFields({
  field,
  update,
  onRemove,
}: {
  field: FormQuestion;
  update: (id: string, key: string, value: unknown) => void;
  onRemove: () => void;
}) {
  const [optionText, setOptionText] = useState(field.options.join(", "));
  return (
    <div className={styles.cardBody}>
      <Field label="Label" htmlFor={`question-${field.id}`}>
        <TextInput
          id={`question-${field.id}`}
          value={field.label}
          onChange={(event) => update(field.id, "label", event.target.value)}
          required
        />
      </Field>
      <div className={styles.tools}>
        <select
          aria-label={`Type for ${field.label}`}
          className={styles.select}
          value={field.type}
          onChange={(event) => update(field.id, "type", event.target.value)}
        >
          {[
            "text",
            "paragraph",
            "email",
            "date",
            "number",
            "select",
            "multi_select",
            "attachment",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) =>
              update(field.id, "required", event.target.checked)
            }
          />
          Required
        </label>
        <ActionButton type="button" onClick={onRemove}>
          Remove
        </ActionButton>
      </div>
      {["select", "multi_select"].includes(field.type) && (
        <Field
          label="Options (comma separated)"
          htmlFor={`options-${field.id}`}
        >
          <TextInput
            id={`options-${field.id}`}
            value={optionText}
            onChange={(event) => {
              setOptionText(event.target.value);
              update(
                field.id,
                "options",
                event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              );
            }}
          />
        </Field>
      )}
    </div>
  );
}
