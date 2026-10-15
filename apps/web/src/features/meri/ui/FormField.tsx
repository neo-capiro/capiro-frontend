"use client";
import { useId } from "react";
import styles from "./panel.module.css";

/** Labelled local draft field; read-only values are bound context, never browser authority. */
export function FormField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange?: ((value: string) => void) | undefined;
  multiline?: boolean;
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
      {multiline ? <textarea rows={1} {...shared} /> : <input {...shared} />}
    </div>
  );
}
