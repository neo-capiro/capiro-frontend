"use client";
import { ActionButton, TextInput } from "../../../shared/module-ui";
import {
  researchRuleFields,
  researchRuleOperators,
  type ResearchRule,
} from "../../../shared/capiro/operations/research-rules";
import styles from "./research.module.css";
export const blankRule = (): ResearchRule => ({
  kind: "condition",
  field: "component",
  operator: "eq",
  value: "",
});
export function readableRule(rule: ResearchRule): string {
  if (rule.kind === "not") return `NOT (${readableRule(rule.clause)})`;
  if (rule.kind !== "condition")
    return `(${rule.clauses.map(readableRule).join(` ${rule.kind.toUpperCase()} `)})`;
  return `${rule.field} ${rule.operator} ${Array.isArray(rule.value) ? rule.value.join(", ") : String(rule.value)}`;
}
export function ResearchRuleEditor({
  value,
  onChange,
  disabled,
  depth = 1,
}: {
  value: ResearchRule;
  onChange: (value: ResearchRule) => void;
  disabled: boolean;
  depth?: number;
}) {
  return (
    <fieldset disabled={disabled} className={styles.form}>
      <legend>Rule {depth > 1 ? "clause" : "expression"}</legend>
      <label>
        Match{" "}
        <select
          className={styles.select}
          value={value.kind}
          onChange={(e) => {
            const kind = e.target.value;
            onChange(
              kind === "condition"
                ? blankRule()
                : kind === "not"
                  ? { kind, clause: blankRule() }
                  : { kind: kind as "and" | "or", clauses: [blankRule()] },
            );
          }}
        >
          <option value="condition">One condition</option>
          {depth < 5 && (
            <>
              <option value="and">All conditions</option>
              <option value="or">Any condition</option>
              <option value="not">Exclude a condition</option>
            </>
          )}
        </select>
      </label>
      {value.kind === "condition" ? (
        <div className={styles.toolbar}>
          <label>
            Field{" "}
            <select
              className={styles.select}
              value={value.field}
              onChange={(e) => onChange({ ...value, field: e.target.value })}
            >
              {researchRuleFields.map((field) => (
                <option key={field}>{field}</option>
              ))}
              {!researchRuleFields.some((field) => field === value.field) && (
                <option>{value.field}</option>
              )}
            </select>
          </label>
          <label>
            Comparison{" "}
            <select
              className={styles.select}
              value={value.operator}
              onChange={(e) =>
                onChange({
                  ...value,
                  operator: e.target.value as typeof value.operator,
                  value: e.target.value === "exists" ? true : "",
                })
              }
            >
              {researchRuleOperators.map((operator) => (
                <option key={operator}>{operator}</option>
              ))}
            </select>
          </label>
          {value.operator === "exists" ? (
            <label>
              Present{" "}
              <select
                value={String(value.value)}
                onChange={(e) =>
                  onChange({ ...value, value: e.target.value === "true" })
                }
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          ) : (
            <label>
              Value{" "}
              <TextInput
                aria-label="Condition value"
                value={
                  Array.isArray(value.value)
                    ? value.value.join(", ")
                    : String(value.value)
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  const scalar = (v: string) =>
                    value.field === "fiscalYear" &&
                    v.trim() &&
                    Number.isFinite(Number(v))
                      ? Number(v)
                      : v;
                  onChange({
                    ...value,
                    value: ["in", "not_in"].includes(value.operator)
                      ? raw.split(",").map((v) => scalar(v.trim()))
                      : scalar(raw),
                  });
                }}
              />
              {["in", "not_in"].includes(value.operator) && (
                <small>Separate values with commas.</small>
              )}
            </label>
          )}
        </div>
      ) : value.kind === "not" ? (
        <ResearchRuleEditor
          value={value.clause}
          onChange={(clause) => onChange({ ...value, clause })}
          disabled={disabled}
          depth={depth + 1}
        />
      ) : (
        <>
          {value.clauses.map((clause, index) => (
            <div key={index} className={styles.form}>
              <ResearchRuleEditor
                value={clause}
                onChange={(next) =>
                  onChange({
                    ...value,
                    clauses: value.clauses.map((c, i) =>
                      i === index ? next : c,
                    ),
                  })
                }
                disabled={disabled}
                depth={depth + 1}
              />
              <ActionButton
                disabled={value.clauses.length === 1}
                onClick={() =>
                  onChange({
                    ...value,
                    clauses: value.clauses.filter((_, i) => i !== index),
                  })
                }
              >
                Remove condition {index + 1}
              </ActionButton>
            </div>
          ))}
          <ActionButton
            disabled={value.clauses.length >= 50}
            onClick={() =>
              onChange({ ...value, clauses: [...value.clauses, blankRule()] })
            }
          >
            Add condition
          </ActionButton>
        </>
      )}
    </fieldset>
  );
}
