"use client";
import { useId, useState } from "react";
import { Field, SelectInput, TextInput } from "../../../../../shared/module-ui";
import styles from "./content.module.css";

export function Choice({
  label,
  value,
  values,
  change,
  disabled,
}: {
  label: string;
  value: string;
  values: readonly (string | readonly [string, string])[];
  change: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <SelectInput
        id={id}
        value={value}
        disabled={disabled}
        onValueChange={change}
        options={values.map((entry) =>
          typeof entry === "string"
            ? { value: entry, label: entry }
            : { value: entry[0], label: entry[1] },
        )}
      />
    </Field>
  );
}
export function Entry({
  label,
  value,
  change,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <TextInput
        id={id}
        value={value}
        maxLength={maxLength}
        onChange={(event) => change(event.target.value)}
      />
    </Field>
  );
}
export function NumberEntry({
  label,
  value,
  min = 0,
  max = 1000,
  step = 1,
  change,
}: {
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  change: (value: number | undefined) => void;
}) {
  const id = useId();
  // Keep incomplete keyboard input local; only valid values enter editor history.
  const [input, setInput] = useState({ value, text: String(value ?? "") });
  if (input.value !== value) setInput({ value, text: String(value ?? "") });
  return (
    <Field label={label} htmlFor={id}>
      <TextInput
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={input.text}
        onBlur={() => setInput({ value, text: String(value ?? "") })}
        onChange={(event) => {
          const raw = event.target.value;
          setInput({ value, text: raw });
          if (!raw) change(undefined);
          else if (
            Number.isFinite(event.target.valueAsNumber) &&
            event.target.valueAsNumber >= min &&
            event.target.valueAsNumber <= max
          )
            change(event.target.valueAsNumber);
        }}
      />
    </Field>
  );
}
export function Toggle({
  label,
  checked,
  change,
}: {
  label: string;
  checked: boolean;
  change: (value: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      {label}
      <input
        role="switch"
        type="checkbox"
        checked={checked}
        onChange={(event) => change(event.target.checked)}
      />
    </label>
  );
}
