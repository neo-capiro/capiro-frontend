"use client";
import { useId, useState } from "react";
import styles from "./token-input.module.css";
export function TokenInput({
  label,
  value,
  onChange,
  placeholder,
  layout = "stacked",
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  layout?: "stacked" | "inline";
}) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const add = () => {
    const tokens = draft
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (tokens.length) onChange([...new Set([...value, ...tokens])]);
    setDraft("");
  };
  const input = (
    <input
      id={inputId}
      value={draft}
      placeholder={placeholder ?? "Add a value and press Enter"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={add}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          add();
        }
      }}
    />
  );
  const tokens = value.map((token) => (
    <span className={layout === "inline" ? styles.token : "chip"} key={token}>
      {layout === "inline" ? <span>{token}</span> : token}
      <button
        type="button"
        className={layout === "inline" ? styles.remove : "button ghost"}
        aria-label={`Remove ${token} from ${label}`}
        onClick={() => onChange(value.filter((v) => v !== token))}
      >
        ×
      </button>
    </span>
  ));
  if (layout === "inline")
    return (
      <div className={styles.inline}>
        <label htmlFor={inputId}>{label}</label>
        <div className={styles.field}>
          {tokens}
          {input}
        </div>
      </div>
    );
  return (
    <div className="stack" style={{ gap: 6 }}>
      <label>
        {label}
        {input}
      </label>
      <div className="row">{tokens}</div>
    </div>
  );
}
