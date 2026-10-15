"use client";
import { useState } from "react";
import { FormField } from "../../ui/FormField";
import type { SettingsField } from "./settings-view";
import styles from "./settings.module.css";

/**
 * Preference fields. Editable fields keep local drafts only (nothing is saved);
 * inactive fields show values Meri cannot change until settings are connected.
 */
export function SettingsFields({
  fields,
  mode,
}: {
  fields: readonly SettingsField[];
  mode: "editable" | "inactive";
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.id, field.value])),
  );
  return fields.map((field) => (
    <FormField
      key={field.id}
      className={mode === "inactive" ? styles.inactiveField : styles.field}
      label={field.label}
      value={drafts[field.id] ?? ""}
      placeholder={field.placeholder}
      onChange={
        mode === "editable"
          ? (value) =>
              setDrafts((current) => ({ ...current, [field.id]: value }))
          : undefined
      }
    />
  ));
}
