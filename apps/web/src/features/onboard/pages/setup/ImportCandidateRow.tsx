import { Icon, Tag } from "../../ui/primitives";
import type { ImportCandidate } from "../../lib/capiro-api";
export function formatCompactSpend(n: number): string {
  if (n < 1000) return `$${Math.round(n)}`;
  if (n < 1_000_000) return `$${Math.round(n / 1000)}K`;
  return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function ImportCandidateRow({
  candidate: c,
  index: i,
  count,
  selected: isSel,
  capHit,
  locked,
  toggle,
}: {
  candidate: ImportCandidate;
  index: number;
  count: number;
  selected: boolean;
  capHit: boolean;
  locked: boolean;
  toggle: (id: number) => void;
}) {
  const isImported = c.onboardedAs != null;
  const disabled = isImported || (!isSel && capHit);
  return (
    <div
      key={c.ldaClientId}
      role="checkbox"
      tabIndex={disabled || locked ? -1 : 0}
      aria-checked={isSel}
      aria-disabled={disabled || locked}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          toggle(c.ldaClientId);
        }
      }}
      onClick={() => !disabled && toggle(c.ldaClientId)}
      style={{
        display: "grid",
        gridTemplateColumns: "34px 1fr 130px 70px 70px",
        alignItems: "center",
        padding: "9px 14px",
        borderBottom: i < count - 1 ? "1px solid var(--border-1)" : "none",
        cursor: disabled ? "default" : "pointer",
        opacity: !isImported && disabled ? 0.45 : 1,
        background: isSel ? "var(--accent-soft)" : "#fff",
      }}
    >
      <span
        style={{
          width: 15,
          height: 15,
          borderRadius: 4,
          display: "grid",
          placeItems: "center",
          border: isSel
            ? "1px solid var(--accent)"
            : "1px solid var(--border-strong)",
          background: isSel
            ? "var(--accent)"
            : isImported
              ? "var(--bg-sunken)"
              : "#fff",
        }}
      >
        {isSel && (
          <Icon
            name="Check"
            size={10}
            strokeWidth={3}
            style={{ color: "#fff" }}
          />
        )}
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <b
          style={{
            fontSize: 12.5,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {c.name}
        </b>
        {isImported && <Tag tone="neutral">Imported</Tag>}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: 0,
          color: "var(--ink-2)",
        }}
      >
        {formatCompactSpend(c.totalSpend)}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: 0,
          color: "var(--ink-2)",
        }}
      >
        {c.filings}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          letterSpacing: 0,
          color: "var(--ink-2)",
        }}
      >
        {c.latestFilingYear ?? "—"}
      </span>
    </div>
  );
}
