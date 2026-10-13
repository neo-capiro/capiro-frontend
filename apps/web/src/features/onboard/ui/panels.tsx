import React from "react";
import { Icon } from "./icons";

// 11px uppercase severity tag
export function Tag({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "blue" | "success" | "critical" | "notable";
  children?: React.ReactNode;
}) {
  const tones = {
    neutral: {
      bg: "var(--bg-sunken)",
      fg: "var(--ink-2)",
      bd: "var(--border-1)",
    },
    blue: {
      bg: "var(--accent-soft)",
      fg: "var(--accent-ink)",
      bd: "transparent",
    },
    success: {
      bg: "var(--success-soft)",
      fg: "var(--success)",
      bd: "transparent",
    },
    critical: {
      bg: "var(--critical-soft)",
      fg: "var(--critical)",
      bd: "transparent",
    },
    notable: {
      bg: "var(--notable-soft)",
      fg: "var(--notable)",
      bd: "transparent",
    },
  }[tone];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        background: tones.bg,
        color: tones.fg,
        border: `1px solid ${tones.bd}`,
        borderRadius: 4,
        padding: "2px 7px",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  style,
  pad = 24,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  pad?: number;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--border-1)",
        borderRadius: 8,
        boxShadow: "0 1px 2px rgba(21,22,26,0.04)",
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Radio-select option card (plan selection, import preference)
export function OptionCard({
  selected,
  disabled = false,
  onClick,
  title,
  price,
  children,
  badge,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  price?: string;
  children?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        flex: 1,
        cursor: "pointer",
        background: "#fff",
        borderRadius: 8,
        padding: "20px 20px 18px",
        position: "relative",
        border: selected
          ? "1.5px solid var(--accent)"
          : "1px solid var(--border-1)",
        boxShadow: selected
          ? "0 0 0 3px var(--accent-glow)"
          : "0 1px 2px rgba(21,22,26,0.04)",
        margin: selected ? 0 : "0.5px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            flexShrink: 0,
            marginTop: 2,
            display: "grid",
            placeItems: "center",
            border: selected
              ? "5px solid var(--accent)"
              : "1.5px solid var(--border-strong)",
            background: "#fff",
          }}
        ></span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <b
              style={{
                fontSize: 15,
                letterSpacing: "-0.01em",
                color: "var(--ink-1)",
              }}
            >
              {title}
            </b>
            {badge}
          </div>
          {price && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-2)",
                marginTop: 3,
                letterSpacing: 0,
              }}
            >
              {price}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "var(--ink-2)",
          lineHeight: 1.55,
          paddingLeft: 26,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function InfoBlock({
  icon,
  title,
  tag,
  children,
}: {
  icon: string;
  title: React.ReactNode;
  tag?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border-1)",
        borderRadius: 6,
        padding: "12px 14px",
      }}
    >
      <Icon
        name={icon}
        size={16}
        style={{ color: "var(--ink-3)", marginTop: 1 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <b style={{ fontSize: 12.5 }}>{title}</b>
          {tag}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--ink-2)",
            lineHeight: 1.55,
            overflowWrap: "break-word",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
