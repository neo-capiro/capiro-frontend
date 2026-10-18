"use client";
import Link from "next/link";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { useObjectives } from "./queries";
import { statusLabels } from "./contracts";
import styles from "./objective-summary.module.css";
export function ObjectiveSummary({ clientId }: { clientId: string }) {
  const query = useObjectives(clientId);
  const records = query.isSuccess && !query.error ? query.data : undefined;
  return (
    <section className={`card ${styles.card}`} aria-label="Objectives summary">
      <header className="row between">
        <div className="row">
          <h2>Objectives</h2>
          {records && <small>{records.length} current objectives</small>}
        </div>
        <Link className="button" href={`/portfolio/${clientId}/objectives`}>
          View all
        </Link>
      </header>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <div className={styles.list}>
        {records?.slice(0, 3).map((objective) => (
          <Link
            key={objective.id}
            href={`/portfolio/${clientId}/objectives?objective=${objective.id}`}
          >
            <strong>{objective.outcome || "Untitled objective"}</strong>
            <small>{statusLabels[objective.status]}</small>
          </Link>
        ))}
      </div>
      {records?.length === 0 && (
        <p className="muted">
          No objectives yet. Define the first outcome for this client.
        </p>
      )}
    </section>
  );
}
