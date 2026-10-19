"use client";
import { useState } from "react";
import type { z } from "zod";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { budget as budgetSchema } from "../../../shared/capiro/operations/planner-budgets";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import {
  ActionButton,
  Field,
  Modal,
  SelectInput,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
type Budget = z.infer<typeof budgetSchema>;
function inputMinor(value: string) {
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(value))
    throw new Error(
      "Use a nonnegative amount with at most two decimal places.",
    );
  const [whole, fraction = ""] = value.split(".");
  return (BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
}
function minorInput(value: string | null) {
  return value === null
    ? ""
    : `${BigInt(value) / 100n}.${(BigInt(value) % 100n).toString().padStart(2, "0")}`;
}
type Props = {
  kind: "budget" | "rates" | "alert";
  budget: Budget;
  people: PlannerPerson[];
  onClose: () => void;
  onSaved: () => void;
};
type Model = ReturnType<typeof useBudgetEditor>;
function useBudgetEditor({ kind, budget, people, onClose, onSaved }: Props) {
  const api = useCapiro();
  const [measurement, setMeasurement] = useState(budget.data.measurement),
    [value, setValue] = useState(
      budget.data.measurement === "cost"
        ? minorInput(budget.data.budgetMinor)
        : budget.data.budgetMinutes === null
          ? ""
          : String(budget.data.budgetMinutes / 60),
    ),
    [filter, setFilter] = useState(budget.data.actualFilter),
    [rates, setRates] = useState<Record<string, string>>(
      Object.fromEntries(
        budget.data.rates.map((rate) => [
          rate.userId,
          minorInput(rate.hourlyMinor),
        ]),
      ),
    ),
    [enabled, setEnabled] = useState(budget.alert.enabled),
    [percent, setPercent] = useState(budget.alert.percent),
    [comparison, setComparison] = useState(budget.alert.comparison),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (kind === "alert")
        await api.request("planner.project.budget.alert", {
          params: { id: budget.projectId },
          body: {
            version: budget.alert.version,
            data: { enabled, percent, comparison },
          },
        });
      else
        await api.request("planner.project.budget.update", {
          params: { id: budget.projectId },
          body: {
            version: budget.version,
            data:
              kind === "rates"
                ? {
                    rates: editedRates(budget.data.rates, people, rates),
                  }
                : {
                    measurement,
                    actualFilter: filter,
                    ...(measurement === "cost"
                      ? { budgetMinor: value ? inputMinor(value) : null }
                      : {
                          budgetMinutes: value
                            ? Math.round(Number(value) * 60)
                            : null,
                        }),
                  },
          },
        });
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update project budget.",
      );
    } finally {
      setBusy(false);
    }
  };
  return {
    measurement,
    setMeasurement,
    value,
    setValue,
    filter,
    setFilter,
    rates,
    setRates,
    enabled,
    setEnabled,
    percent,
    setPercent,
    comparison,
    setComparison,
    busy,
    error,
    submit,
  };
}
export function BudgetDialog(props: Props) {
  const m = useBudgetEditor(props);
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={
        props.kind === "budget"
          ? "Set project budget"
          : props.kind === "rates"
            ? "Project rates"
            : "My budget alert"
      }
      description={
        props.kind === "rates"
          ? `Rates in ${props.budget.data.currency} per hour.`
          : "Changes require the current stored version."
      }
    >
      <form className={styles.stack} onSubmit={(event) => void m.submit(event)}>
        {props.kind === "budget" ? (
          <BudgetFields budget={props.budget} model={m} />
        ) : props.kind === "rates" ? (
          <RateFields people={props.people} model={m} />
        ) : (
          <BudgetAlertFields model={m} />
        )}{" "}
        {m.error && (
          <p role="alert" className={styles.error}>
            {m.error}
          </p>
        )}
        <div className={styles.footer}>
          <ActionButton type="button" onClick={props.onClose}>
            Cancel
          </ActionButton>
          <ActionButton primary type="submit" disabled={m.busy}>
            Save
          </ActionButton>
        </div>
      </form>
    </Modal>
  );
}
function BudgetFields({ budget, model: m }: { budget: Budget; model: Model }) {
  return (
    <>
      <Field label="Measurement" htmlFor="budget-measurement">
        <SelectInput
          id="budget-measurement"
          value={m.measurement}
          onValueChange={(value) => {
            m.setMeasurement(value as "time" | "cost");
            m.setValue("");
          }}
          options={[
            { value: "time", label: "Time" },
            { value: "cost", label: "Cost" },
          ]}
        />
      </Field>
      <Field
        label={
          m.measurement === "time"
            ? "Budget hours"
            : `Budget amount (${budget.data.currency})`
        }
        htmlFor="budget-value"
      >
        <TextInput
          id="budget-value"
          inputMode="decimal"
          value={m.value}
          onChange={(event) => m.setValue(event.target.value)}
        />
      </Field>
      <Field label="Actual time included" htmlFor="budget-filter">
        <SelectInput
          id="budget-filter"
          value={m.filter}
          onValueChange={(value) =>
            m.setFilter(value as Budget["data"]["actualFilter"])
          }
          options={["all", "billable", "nonbillable"].map((value) => ({
            value,
            label: value,
          }))}
        />
      </Field>
    </>
  );
}
function RateFields({
  people,
  model: m,
}: {
  people: PlannerPerson[];
  model: Model;
}) {
  return (
    <>
      {people.map((person) => (
        <Field
          key={person.id}
          label={person.name}
          htmlFor={`rate-${person.id}`}
        >
          <TextInput
            id={`rate-${person.id}`}
            inputMode="decimal"
            value={m.rates[person.id] ?? ""}
            onChange={(event) =>
              m.setRates((old) => ({ ...old, [person.id]: event.target.value }))
            }
          />
        </Field>
      ))}
    </>
  );
}
function BudgetAlertFields({ model: m }: { model: Model }) {
  return (
    <>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={m.enabled}
          onChange={(event) => m.setEnabled(event.target.checked)}
        />
        Enable my alert
      </label>
      <Field label="Threshold percent" htmlFor="budget-percent">
        <TextInput
          type="number"
          id="budget-percent"
          value={m.percent}
          min={1}
          max={1000}
          onChange={(event) => m.setPercent(Number(event.target.value))}
        />
      </Field>
      <Field label="Compare actual against" htmlFor="budget-comparison">
        <SelectInput
          id="budget-comparison"
          value={m.comparison}
          onValueChange={(value) =>
            m.setComparison(value as "budget" | "estimate")
          }
          options={[
            { value: "budget", label: "Budget" },
            { value: "estimate", label: "Estimate" },
          ]}
        />
      </Field>
    </>
  );
}

function editedRates(
  existing: Budget["data"]["rates"],
  people: PlannerPerson[],
  rates: Record<string, string>,
) {
  return [
    ...existing.filter(
      (rate) => !people.some((person) => person.id === rate.userId),
    ),
    ...people
      .filter((person) => rates[person.id])
      .map((person) => ({
        userId: person.id,
        name: person.name,
        hourlyMinor: inputMinor(rates[person.id]!),
      })),
  ];
}
