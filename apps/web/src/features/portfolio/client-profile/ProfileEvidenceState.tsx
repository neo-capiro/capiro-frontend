"use client";
import { useState, type ReactNode } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";

export function ProfileEvidenceState({
  query,
}: {
  query: {
    enabled: boolean;
    scopeAvailable: boolean;
    isPending: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
}) {
  if (!query.enabled)
    return (
      <p className="muted">
        {query.scopeAvailable
          ? "A current session is required to load this evidence."
          : "A resolved current location and district are required for this evidence."}
      </p>
    );
  return (
    <QueryState
      pending={query.isPending}
      error={query.error}
      retry={() => {
        void query.refetch();
      }}
    />
  );
}

/** Local expansion of an already returned result, never a completeness claim. */
export function ProfileReturnedRows<Row>({
  rows,
  render,
  rowKey,
}: {
  rows: readonly Row[];
  render: (row: Row) => ReactNode;
  rowKey: (row: Row, index: number) => string;
}) {
  const [visible, setVisible] = useState(10);
  return (
    <>
      <ul className="stack">
        {rows.slice(0, visible).map((row, index) => (
          <li key={rowKey(row, index)}>{render(row)}</li>
        ))}
      </ul>
      {rows.length > visible && (
        <button
          className="button"
          onClick={() => setVisible((count) => count + 20)}
        >
          Show more returned records ({Math.min(visible, rows.length)} of{" "}
          {rows.length} shown)
        </button>
      )}
    </>
  );
}

export const profileTime = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString()
    : "Unavailable";
