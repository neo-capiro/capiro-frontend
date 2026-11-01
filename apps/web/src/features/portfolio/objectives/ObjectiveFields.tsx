"use client";
import { useId } from "react";
import { StrategyIntakeFields } from "@/shared/strategy-intake/StrategyIntakeFields";
import { TextareaField } from "@/shared/portfolio/ui/TextareaField";
import {
  askTypes,
  objectiveFieldsSchema,
  type ObjectiveFields as Fields,
} from "./contracts";
import styles from "./objective-intake.module.css";

type Props = {
  fields: Fields;
  onChange: (fields: Fields) => void;
  disabled: boolean;
  presentation: "page" | "dialog";
};
const textFields = {
  outcome: {
    label: "Outcome",
    hint: "What do you want to be true?",
    dialogHint: "What should be different?",
    placeholder: "One sentence",
    maxLength: 2000,
    rows: 2,
  },
  governmentProblem: {
    label: "Government problem",
    hint: "What does this solve for the Department or Congress?",
    dialogHint: "What must government solve?",
    placeholder: "One sentence",
    maxLength: 4000,
    rows: 2,
  },
  minimumWin: {
    label: "Minimum win",
    hint: "The least that still counts as success",
    dialogHint: "What is the smallest result that matters?",
    placeholder: "An amount, a provision, a report",
    maxLength: 2000,
    rows: 2,
  },
  limits: {
    label: "Limits",
    hint: undefined,
    dialogHint: "Optional boundaries and constraints",
    placeholder: "Amounts, language, or topics that cannot move",
    maxLength: 4000,
    rows: 1,
  },
} as const;

function ObjectiveTextField({
  field,
  fields,
  onChange,
  presentation,
}: Omit<Props, "disabled"> & {
  field: keyof typeof textFields;
}) {
  const definition = textFields[field];
  const page = presentation === "page";
  return (
    <TextareaField
      label={
        <>
          {definition.label}
          {page && (
            <span aria-hidden="true">
              {field === "limits" ? " (optional)" : " *"}
            </span>
          )}
        </>
      }
      hint={page ? definition.hint : definition.dialogHint}
      autoFocus={field === "outcome"}
      className={page ? styles[field] : undefined}
      maxLength={definition.maxLength}
      placeholder={page ? definition.placeholder : undefined}
      rows={page ? definition.rows : undefined}
      value={fields[field]}
      onChange={(event) => onChange({ ...fields, [field]: event.target.value })}
    />
  );
}

function ObjectiveAskType({
  fields,
  onChange,
  presentation,
}: Omit<Props, "disabled">) {
  const name = useId();
  const select = (value: string) => {
    const parsed = objectiveFieldsSchema.shape.askType.safeParse(value || null);
    if (parsed.success) onChange({ ...fields, askType: parsed.data });
  };
  if (presentation === "dialog")
    return (
      <label>
        Ask type
        <select
          value={fields.askType ?? ""}
          onChange={(event) => select(event.target.value)}
        >
          <option value="">Choose an ask type</option>
          {Object.entries(askTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    );
  return (
    <fieldset className={styles.askType}>
      <legend>
        Type of ask <span aria-hidden="true">*</span>
      </legend>
      <div className={styles.askChoices}>
        {Object.entries(askTypes).map(([value, label]) => (
          <label className={styles.askChoice} key={value}>
            <input
              type="radio"
              name={name}
              value={value}
              checked={fields.askType === value}
              onChange={() => select(value)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Controlled field presentation shared by the full-page creator and edit drawer. */
export function ObjectiveFields(props: Props) {
  if (props.fields.strategyIntake)
    return (
      <StrategyIntakeFields
        value={props.fields.strategyIntake}
        disabled={props.disabled}
        onChange={(strategyIntake) =>
          props.onChange({ ...props.fields, strategyIntake })
        }
      />
    );
  return (
    <fieldset
      className={`stack ${styles.fields} ${props.presentation === "page" ? styles.pageFields : ""}`}
      disabled={props.disabled}
    >
      <legend className="srOnly">Objective details</legend>
      <ObjectiveTextField {...props} field="outcome" />
      <ObjectiveTextField {...props} field="governmentProblem" />
      <ObjectiveAskType {...props} />
      <ObjectiveTextField {...props} field="minimumWin" />
      <ObjectiveTextField {...props} field="limits" />
    </fieldset>
  );
}
