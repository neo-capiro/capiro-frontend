"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { AttentionClient } from "./contracts";
import { accessibleAlerts } from "./model";
import { usePortfolioAttention } from "./query";
import { AttentionItem } from "./AttentionItem";
import { AttentionDetail } from "./AttentionDetail";
import styles from "./attention.module.css";

export function PortfolioAttention({
  clients,
}: {
  clients: readonly AttentionClient[];
}) {
  const { identity, permitted, alerts } = usePortfolioAttention(clients);
  const params = useSearchParams();
  const router = useRouter();
  const data = permitted && !alerts.error ? alerts.data : undefined;
  const rows = data ? accessibleAlerts(data.alerts, clients) : [];
  const selectedId = params.get("alert");
  const selected = rows.find((row) => row.id === selectedId);
  return (
    <aside className={styles.card} aria-label="Needs attention">
      <header className={styles.header}>
        <h2>Needs attention</h2>
        {data && (
          <span
            className={styles.count}
            role="note"
            aria-label={`${rows.length} shown alerts`}
          >
            {rows.length}
          </span>
        )}
        <span className={styles.order} title="Ordered by the source service">
          Most urgent
        </span>
      </header>
      <p className={styles.description}>
        Review each alert&apos;s source record and available destinations.
      </p>
      <QueryState
        pending={identity.isPending}
        error={identity.error}
        retry={() => void identity.refetch()}
      />
      {!identity.isPending && !identity.error && !permitted && (
        <p className="status">This account cannot access portfolio alerts.</p>
      )}
      {permitted && clients.length === 0 && (
        <p className="status">No accessible clients to check.</p>
      )}
      {permitted && clients.length > 0 && (
        <QueryState
          pending={alerts.isPending}
          error={alerts.error}
          retry={() => void alerts.refetch()}
        />
      )}
      {data && (
        <>
          {selectedId && (
            <AttentionDetail
              alert={selected}
              onClose={() => {
                const next = new URLSearchParams(params.toString());
                next.delete("alert");
                router.replace(`/portfolio${next.size ? `?${next}` : ""}`, {
                  scroll: false,
                });
              }}
            />
          )}
          {rows.length ? (
            <ul className={styles.list} aria-label="Reported client alerts">
              {rows.map((alert) => (
                <AttentionItem key={alert.id} alert={alert} />
              ))}
            </ul>
          ) : (
            <p className="status" role="status">
              No alerts were returned for your accessible clients. Coverage is
              incomplete; this does not confirm there is nothing to review.
            </p>
          )}
          <footer className={styles.footer}>
            <p>
              Showing up to 50 alerts across your active clients. Some sources
              may be unavailable, so this is not a complete record.
            </p>
            <div className={styles.freshness}>
              <span>
                Snapshot{" "}
                <time dateTime={data.generatedAt} title={data.generatedAt}>
                  {new Date(data.generatedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                </time>
              </span>
              <button
                className="button ghost"
                disabled={alerts.isFetching}
                onClick={() => void alerts.refetch()}
              >
                {alerts.isFetching ? "Refreshing…" : "Refresh alerts"}
              </button>
            </div>
          </footer>
        </>
      )}
    </aside>
  );
}
