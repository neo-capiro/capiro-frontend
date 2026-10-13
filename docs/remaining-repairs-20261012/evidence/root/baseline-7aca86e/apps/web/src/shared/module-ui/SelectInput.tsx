"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@capiro/ui/select";
import styles from "./module-ui.module.css";

const emptyValue = "__capiro_empty_selection__";
export function SelectInput({
  value,
  onValueChange,
  options,
  id,
  placeholder,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Select
      value={
        value === "" && options.some((option) => option.value === "")
          ? emptyValue
          : value
      }
      onValueChange={(next) => onValueChange(next === emptyValue ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={styles.selectTrigger}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={styles.selectContent}>
        {options.map((option) => (
          <SelectItem
            className={styles.selectItem}
            key={option.value}
            value={option.value === "" ? emptyValue : option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
