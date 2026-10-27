"use client";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import { ActionButton, Panel, StatusPanel } from "../../../shared/module-ui";
import styles from "./research.module.css";
export function ResearchOverview({ portfolio }: { portfolio: ResearchDetail }) {
  const analytics = useCapiroQuery("research.analytics", {
    params: { id: portfolio.id },
  });
  const fit = useCapiroQuery("research.fit", { params: { id: portfolio.id } });
  const refreshFit = useCapiroMutation("research.fit.refresh");
  async function refresh() {
    try {
      await refreshFit.run({ params: { id: portfolio.id } });
      fit.reload();
    } catch {
      /* The error remains visible. */
    }
  }
  const reviews = useCapiroQuery("research.reviews", {
    params: { id: portfolio.id },
    query: { lane: "team" },
  });
  const total =
    analytics.data?.totals.length === 1 ? analytics.data.totals[0] : undefined;
  return (
    <>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>Members</span>
          <strong>{portfolio.memberCount}</strong>
          <small>
            {
              portfolio.members.filter((m) => m.disposition === "unresolved")
                .length
            }{" "}
            unresolved
          </small>
        </div>
        <div className={styles.metric}>
          <span>Linked clients</span>
          <strong>{portfolio.clientLinkCount}</strong>
          <small>
            {portfolio.clientLinks.map((c) => c.clientName).join(", ")}
          </small>
        </div>
        <div className={styles.metric}>
          <span>
            {total
              ? `FY${total.basis.fundingFiscalYear} · ${total.basis.stage}`
              : "Financial position"}
          </span>
          <strong>
            {total
              ? `${total.value} ${total.basis.unit === "usd_millions" ? "USD M" : total.basis.unit}`
              : analytics.data?.totals.length
                ? "Multiple bases"
                : "Not available"}
          </strong>
          <small>{analytics.data?.availability || "Loading coverage…"}</small>
        </div>
        <div className={styles.metric}>
          <span>Open reviews</span>
          <strong>
            {reviews.data?.filter(
              (r) => !["resolved", "cancelled"].includes(r.status),
            ).length ?? "—"}
          </strong>
        </div>
      </div>
      <div className={styles.split}>
        <Panel
          title="Linked-client fit"
          actions={
            <ActionButton
              disabled={
                refreshFit.pending ||
                portfolio.myRole === "viewer" ||
                portfolio.lifecycle === "archived"
              }
              onClick={() => void refresh()}
            >
              Refresh fit
            </ActionButton>
          }
        >
          <StatusPanel
            loading={fit.loading}
            error={fit.error || refreshFit.error}
            onRetry={fit.reload}
          >
            {fit.data?.clientFits.map((c) => (
              <div key={c.clientId} className={styles.row}>
                <span>{c.clientName}</span>
                <div className={styles.fit}>
                  {c.fitScore == null ? (
                    <span className={styles.muted}>Insufficient evidence</span>
                  ) : (
                    <>
                      <progress
                        max={100}
                        value={c.fitScore}
                        aria-label={`${c.clientName} fit`}
                      />
                      <span>{c.fitScore}%</span>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!fit.data?.clientFits.length && (
              <p className={styles.content}>No linked-client fit results.</p>
            )}
            {fit.data?.limitations?.map((l) => (
              <p key={l} className={styles.content}>
                {l}
              </p>
            ))}
          </StatusPanel>
        </Panel>
        <Panel title="Recent history">
          {portfolio.recentEvents.map((e) => (
            <div className={styles.row} key={e.id}>
              <div>
                {e.eventKind.replaceAll("_", " ")}
                <div className={styles.muted}>
                  Revision {e.aggregateRevision}
                </div>
              </div>
              <span className={styles.muted}>
                {new Date(e.occurredAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
