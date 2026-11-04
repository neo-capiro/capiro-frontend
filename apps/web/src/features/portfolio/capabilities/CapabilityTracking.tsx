"use client";
import { useState } from "react";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { usePortfolioCommand, useCapabilityTracking } from "./depth-api";
import {
  trackingFeedSchema,
  trackingRecordSchema,
  type TrackingRecord,
} from "./depth-contracts";
import styles from "./depth.module.css";

export function CapabilityTracking({
  clientId,
  capabilityId,
}: {
  clientId: string;
  capabilityId: string;
}) {
  const query = useCapabilityTracking(clientId, capabilityId);
  const [status, setStatus] = useState("active");
  const [kind, setKind] = useState("all");
  const rows =
    query.isSuccess && !query.error
      ? [...query.data.items, ...query.data.pending]
      : [];
  const terms =
    query.isSuccess && !query.error
      ? query.data.terms.filter(
          (term) =>
            term.capabilityId === capabilityId &&
            !["naics", "psc"].includes(term.kind),
        )
      : [];
  const eligible = new Set(terms.map((term) => term.id));
  const visible = rows.filter(
    (item) =>
      item.status === status &&
      (kind === "all" || item.itemKind === kind) &&
      (status !== "active" || item.termIds.some((id) => eligible.has(id))),
  );
  const action = usePortfolioCommand(
    clientId,
    `tracking:${capabilityId}`,
    ({
      item,
      action,
    }: {
      item: TrackingRecord;
      action: "dismiss" | "restore";
    }) => ({
      path: `capabilities/${capabilityId}/tracking`,
      schema: trackingRecordSchema,
      body: {
        itemKind: item.itemKind,
        itemId: item.itemId,
        action,
        termIds: item.termIds,
      },
    }),
  );
  const refresh = usePortfolioCommand(
    clientId,
    `tracking-refresh:${capabilityId}`,
    () => ({
      path: `capabilities/${capabilityId}/tracking/refresh`,
      schema: trackingFeedSchema,
      body: {},
    }),
  );
  return (
    <section className={styles.section} aria-label="Capability tracking">
      <header className="row between">
        <div>
          <h3>Capability tracking</h3>
          <p className="muted">
            Only approved watch terms feed active tracking. Existing client
            tracking stays at client scope.
          </p>
        </div>
        <button
          className="button"
          disabled={!refresh.canWrite || terms.length === 0}
          onClick={() => refresh.mutate()}
        >
          Refresh tracking
        </button>
      </header>
      <div className={styles.chips}>
        {terms.map((term) => (
          <span className="chip" key={term.id}>
            {term.value}
          </span>
        ))}
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error ?? action.error ?? refresh.error}
        retry={() => void query.refetch()}
      />
      <div className={styles.actions}>
        <label>
          View
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="active">Tracked</option>
            <option value="pending">Waiting on your approval</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
        <label>
          Source type
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="all">All sources</option>
            {["bill", "hearing", "budget", "grant", "news", "statement"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
      </div>
      {terms.length === 0 && (
        <p className={styles.notice}>
          Approve a keyword, tag or program line to start capability tracking.
        </p>
      )}
      <div className={styles.grid}>
        {visible.map((item) => (
          <article className={styles.card} key={item.id}>
            <p className="eyebrow">
              {item.itemKind} ·{" "}
              {item.status === "active" ? "Tracked" : item.status}
            </p>
            <h4>{item.title ?? "Source details unavailable"}</h4>
            <p>
              {item.explanation ??
                `Matched terms: ${
                  terms
                    .filter((term) => item.termIds.includes(term.id))
                    .map((term) => term.value)
                    .join(", ") || "Pending term review"
                }`}
            </p>
            <p className="muted">
              {item.dateKind ?? "Dated"} ·{" "}
              {item.occurredAt
                ? new Date(item.occurredAt).toLocaleDateString()
                : "Source date unavailable"}
            </p>
            {item.status === "pending" && (
              <p>Excluded from the active feed until its term is approved.</p>
            )}
            <div className={styles.actions}>
              {safeTrackingUrl(item.url) && (
                <a
                  className="button"
                  href={safeTrackingUrl(item.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source ↗
                </a>
              )}
              {item.status !== "pending" && (
                <button
                  className="button"
                  disabled={!action.canWrite}
                  onClick={() =>
                    action.mutate({
                      item,
                      action:
                        item.status === "dismissed" ? "restore" : "dismiss",
                    })
                  }
                >
                  {item.status === "dismissed" ? "Restore" : "Not relevant"}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {query.isSuccess && visible.length === 0 && (
        <p className="muted">
          No {status === "active" ? "tracked" : status} items in this view.
        </p>
      )}
      {query.isSuccess && !query.error && (
        <>
          <p className="muted">
            Source coverage: {query.data.sourceStatus.replaceAll("_", " ")}
            {query.data.truncated
              ? " · Results limited; narrow the approved terms."
              : ""}
          </p>
          {query.data.gaps.map((gap) => (
            <p key={gap} className="muted">
              {gap}
            </p>
          ))}
        </>
      )}
    </section>
  );
}
function safeTrackingUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
