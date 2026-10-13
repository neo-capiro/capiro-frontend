import React from "react";
import { useLocation, useNavigate } from "../navigation";
import { Icon, Wordmark } from "./icons";

// Flow-1 funnel step indicator
export const OB_F1_STEPS = [
  "Account",
  "Verify",
  "Plan",
  "Legal",
  "Billing",
  "Admins",
  "Clients",
  "Org",
  "Done",
] as const;

export function StepRail({ current }: { current: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        rowGap: 8,
        flexWrap: "wrap",
        maxWidth: "100%",
      }}
    >
      {OB_F1_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && (
            <span
              style={{
                width: 22,
                height: 1,
                background: i <= current ? "var(--accent)" : "var(--border-2)",
              }}
            ></span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 8.5,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                background:
                  i < current
                    ? "var(--accent)"
                    : i === current
                      ? "#fff"
                      : "transparent",
                border:
                  i === current
                    ? "1.5px solid var(--accent)"
                    : i < current
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border-strong)",
                color:
                  i < current
                    ? "#fff"
                    : i === current
                      ? "var(--accent)"
                      : "var(--ink-3)",
              }}
            >
              {i < current ? (
                <Icon name="Check" size={8} strokeWidth={3.4} />
              ) : (
                i + 1
              )}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: i === current ? 700 : 500,
                color:
                  i === current
                    ? "var(--ink-1)"
                    : i < current
                      ? "var(--ink-2)"
                      : "var(--ink-4)",
                letterSpacing: "0.01em",
              }}
            >
              {s}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// Funnel page shell — the registration flow (no sidebar). The prototype's
// EnvBar (fake browser chrome) is intentionally not rendered in production.
// Data-entry steps the user may step BACK through (identity + provisioning
// screens are excluded). Kept in sync with FunnelStepGuard's ladder.
const FUNNEL_BACK_ORDER = [
  "/plan",
  "/legal",
  "/billing",
  "/admins",
  "/clients",
  "/org",
];

export function FunnelShell({
  step,
  children,
  maxWidth = 520,
}: {
  step?: number | null;
  children?: React.ReactNode;
  maxWidth?: number;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const backIdx = FUNNEL_BACK_ORDER.indexOf(location.pathname);
  const backTo = backIdx > 0 ? FUNNEL_BACK_ORDER[backIdx - 1] : null;
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-canvas)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 40px 0",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Wordmark />
        {step != null && <StepRail current={step} />}
        <span style={{ width: 70 }}></span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "44px 40px 64px",
        }}
      >
        <div style={{ width: "100%", maxWidth }}>
          {backTo && (
            <button
              type="button"
              onClick={() => navigate(backTo)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 16,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--ink-3)",
              }}
            >
              <Icon name="ArrowLeft" size={14} />
              Back
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function ScreenTitle({
  kicker,
  title,
  sub,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      {kicker && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--accent)",
            marginBottom: 8,
          }}
        >
          {kicker}
        </div>
      )}
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontWeight: 500,
          fontSize: 28,
          letterSpacing: "-0.015em",
          color: "var(--ink-1)",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      {sub && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13.5,
            color: "var(--ink-2)",
            lineHeight: 1.55,
            textWrap: "pretty",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
