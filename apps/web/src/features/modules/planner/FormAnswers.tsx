"use client";
import { Field, TextArea, TextInput } from "../../../shared/module-ui";
import type { FormQuestion } from "./form-model";
import styles from "./planner.module.css";
export function FormAnswers({
  fields,
  answers,
  onAnswer: update,
  onFiles: setFiles,
}: {
  fields: FormQuestion[];
  answers: Record<string, string | number | string[]>;
  onAnswer: (id: string, value: string | number | string[]) => void;
  onFiles: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
}) {
  return (
    <>
      {" "}
      {fields.map((field) => (
        <Field
          key={field.id}
          label={`${field.label}${field.required ? " *" : ""}`}
          htmlFor={`answer-${field.id}`}
        >
          {field.type === "attachment" ? (
            <input
              id={`answer-${field.id}`}
              type="file"
              required={field.required}
              multiple={field.multiple !== false}
              onChange={(event) =>
                setFiles((old) => ({
                  ...old,
                  [field.id]: Array.from(event.target.files ?? []),
                }))
              }
            />
          ) : field.type === "paragraph" ? (
            <TextArea
              id={`answer-${field.id}`}
              required={field.required}
              maxLength={field.maxLength}
              value={String(answers[field.id] ?? "")}
              onChange={(event) => update(field.id, event.target.value)}
            />
          ) : field.type === "select" ? (
            <select
              id={`answer-${field.id}`}
              className={styles.select}
              required={field.required}
              value={String(answers[field.id] ?? "")}
              onChange={(event) => update(field.id, event.target.value)}
            >
              <option value="">Select…</option>
              {field.options.map((value, index) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          ) : field.type === "multi_select" ? (
            <MultipleChoice
              field={field}
              value={answers[field.id]}
              onChange={(value) => update(field.id, value)}
            />
          ) : (
            <TextInput
              id={`answer-${field.id}`}
              type={
                ["date", "email", "number"].includes(field.type)
                  ? field.type
                  : "text"
              }
              required={field.required}
              maxLength={field.maxLength}
              value={String(answers[field.id] ?? "")}
              onChange={(event) =>
                update(
                  field.id,
                  field.type === "number" && event.target.value !== ""
                    ? Number(event.target.value)
                    : event.target.value,
                )
              }
            />
          )}
        </Field>
      ))}
    </>
  );
}

function MultipleChoice({
  field,
  value,
  onChange,
}: {
  field: FormQuestion;
  value: string | number | string[] | undefined;
  onChange: (value: string[]) => void;
}) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div>
      {field.options.map((value, index) => (
        <label className={styles.checkbox} key={value}>
          <input
            type="checkbox"
            required={field.required && index === 0 && selected.length === 0}
            checked={
              Array.isArray(selected) && (selected as string[]).includes(value)
            }
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [
                      ...(Array.isArray(selected)
                        ? (selected as string[])
                        : []),
                      value,
                    ]
                  : (selected as string[]).filter((item) => item !== value),
              )
            }
          />
          {value}
        </label>
      ))}
    </div>
  );
}
