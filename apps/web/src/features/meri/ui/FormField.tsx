"use client";
import { useId } from "react";
import styles from "./panel.module.css";

/** Labelled field (Figma Field); read-only when no change handler is given, since bound values are context, never browser authority. */
export function FormField({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: ((value: string) => void) | undefined;
  multiline?: boolean;
  type?: "text" | "search";
}) {
  const id = useId();
  const shared = {
    id,
    value,
    readOnly: !onChange,
    onChange: (event: { target: { value: string } }) =>
      onChange?.(event.target.value),
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea rows={1} {...shared} />
      ) : (
        <input type={type} {...shared} />
      )}
    </div>
  );
}
