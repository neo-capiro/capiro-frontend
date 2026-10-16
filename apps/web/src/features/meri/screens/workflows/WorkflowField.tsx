"use client";
import { useId } from "react";
import { FormField } from "../../ui/FormField";
import styles from "./tooling.module.css";

export type WorkflowFieldView = {
  label: string;
  value: string;
  helper: string;
  placeholder?: string;
  /** Unresolved inputs need clarification; unavailable inputs cannot expand access. */
  state?: "default" | "unresolved" | "unavailable";
};

/** Meri/Workflow field: typed workflow input with its canonical value and context line. */
export function WorkflowField({
  field,
  value = field.value,
  onChange,
  search = false,
}: {
  field: WorkflowFieldView;
  value?: string;
  onChange?: ((value: string) => void) | undefined;
  search?: boolean;
}) {
  const helperId = useId();
  const state = field.state ?? "default";
  return (
    <div className={styles.workflowField} data-state={state}>
      <FormField
        label={field.label}
        value={value}
        type={search ? "search" : "text"}
        onChange={state === "unavailable" ? undefined : onChange}
        disabled={state === "unavailable"}
        placeholder={field.placeholder}
        aria-invalid={state === "unresolved" || undefined}
        aria-describedby={field.helper ? helperId : undefined}
      />
      {field.helper ? (
        <p id={helperId} className={styles.caption}>
          {field.helper}
        </p>
      ) : null}
    </div>
  );
}
