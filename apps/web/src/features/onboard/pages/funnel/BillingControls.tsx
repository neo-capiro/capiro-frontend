import { type PayMethod } from "../../lib/funnel";
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const notConfiguredNote = (
  <div style={{ fontSize: 11.5, color: "var(--critical)", lineHeight: 1.5 }}>
    Card and ACH payments are currently unavailable
  </div>
);

export function TabBtn({
  id,
  label,
  tab,
  setTab,
}: {
  id: PayMethod;
  label: string;
  tab: PayMethod;
  setTab: (id: PayMethod) => void;
}) {
  return (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1,
        padding: "8px 0",
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        cursor: "pointer",
        border: "none",
        borderBottom:
          tab === id ? "2px solid var(--accent)" : "2px solid transparent",
        background: "transparent",
        color: tab === id ? "var(--accent-ink)" : "var(--ink-3)",
      }}
    >
      {label}
    </button>
  );
}
