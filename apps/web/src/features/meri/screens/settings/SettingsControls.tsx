"use client";
import ui from "../../ui/meri-ui.module.css";
import styles from "./settings.module.css";

/** Single-choice button group (Figma 09.01 appearance preview): the chosen option is pressed. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.choices} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={option === value ? ui.primary : ui.outline}
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Meri / Preferences / Include run reference: a local off/on chip that grants no permission. */
export function ToggleChip({
  label,
  pressed,
  onChange,
  disabled,
  unavailable,
}: {
  label: string;
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  disabled: boolean;
  unavailable: string;
}) {
  return (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={pressed}
      disabled={disabled}
      title={disabled ? unavailable : undefined}
      onClick={() => onChange(!pressed)}
    >
      {label}
    </button>
  );
}
