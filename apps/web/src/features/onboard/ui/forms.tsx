import React from "react";
import { Icon } from "./icons";

export function Btn({
  variant = "secondary",
  size,
  disabled,
  onClick,
  children,
  style,
  icon,
  type = "button",
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "lg";
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  icon?: string;
  type?: "button" | "submit";
}) {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: size === "sm" ? 12 : 13.5,
    fontWeight: 600,
    letterSpacing: "-0.005em",
    padding:
      size === "sm" ? "5px 11px" : size === "lg" ? "10px 20px" : "8px 16px",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: "1px solid transparent",
    opacity: disabled ? 0.45 : 1,
    transition: "background 0.12s ease",
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--accent)",
      color: "#fff",
      borderColor: "var(--accent)",
    },
    secondary: {
      background: "#fff",
      color: "var(--ink-1)",
      borderColor: "var(--border-1)",
    },
    ghost: { background: "transparent", color: "var(--ink-2)" },
    danger: {
      background: "#fff",
      color: "var(--critical)",
      borderColor: "var(--border-1)",
    },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  optional,
  children,
  style,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <label
      style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ink-2)",
          display: "flex",
          gap: 6,
          alignItems: "baseline",
        }}
      >
        {label}
        {optional && (
          <span
            style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 11 }}
          >
            optional
          </span>
        )}
      </span>
      {children}
      {hint && (
        <span
          style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.45 }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

export const obInputStyle: React.CSSProperties = {
  background: "var(--bg-sunken)",
  border: "1px solid var(--border-1)",
  borderRadius: 6,
  padding: "8px 11px",
  fontSize: 13.5,
  fontFamily: "var(--font-sans)",
  color: "var(--ink-1)",
  outline: "none",
  width: "100%",
  letterSpacing: "-0.005em",
};

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => {
        setFocus(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocus(false);
        props.onBlur?.(e);
      }}
      style={{
        ...obInputStyle,
        ...(focus
          ? {
              boxShadow: "0 0 0 3px var(--accent-glow)",
              borderColor: "var(--accent)",
              background: "#fff",
            }
          : {}),
        ...props.style,
      }}
    />
  );
}

export function SelectInput({
  options,
  value,
  onChange,
  placeholder,
  style,
}: {
  options: string[];
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange && onChange(e.target.value)}
      style={{
        ...obInputStyle,
        appearance: "auto",
        color: value ? "var(--ink-1)" : "var(--ink-3)",
        ...style,
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 9,
        alignItems: "flex-start",
        cursor: "pointer",
        fontSize: 13,
        color: "var(--ink-1)",
        lineHeight: 1.5,
      }}
    >
      <span
        style={{
          position: "relative",
          width: 16,
          height: 16,
          borderRadius: 4,
          marginTop: 1,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          border: checked
            ? "1px solid var(--accent)"
            : "1px solid var(--border-strong)",
          background: checked ? "var(--accent)" : "#fff",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          style={{
            position: "absolute",
            inset: 0,
            margin: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "inherit",
          }}
        />
        {checked && (
          <Icon
            name="Check"
            size={11}
            strokeWidth={3}
            style={{ color: "#fff", pointerEvents: "none" }}
          />
        )}
      </span>
      <span>{children}</span>
    </label>
  );
}
