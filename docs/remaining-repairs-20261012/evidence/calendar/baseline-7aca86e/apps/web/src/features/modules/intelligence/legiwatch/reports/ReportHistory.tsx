"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";

export function ReportHistory({ onOpen }: { onOpen: (id: string) => void }) {
  const [cursors, setCursors] = useState<string[]>([]),
    query = useCapiroQuery("legiwatch.report.history", {
      query: { before: cursors.at(-1) },
    });
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
      empty={
        query.data?.length === 0 ? "No report runs were returned." : undefined
      }
    >
      <div className={styles.list}>
        {query.data?.map((run) => (
          <article className={styles.listItem} key={run.id}>
            <div className={styles.row}>
              <div>
                <strong>Run {run.id.slice(0, 8)}</strong>
                <p className={styles.description}>
                  Generated {new Date(run.generatedAt).toLocaleString()} ·
                  Cutoff {run.cutoff} · Definition version{" "}
                  {run.definitionVersion}
                </p>
              </div>
              <Badge tone={run.complete ? "success" : "warning"}>
                {run.complete ? "Complete" : "Source checks incomplete"}
              </Badge>
            </div>
            <div className={styles.actions}>
              <Badge>{run.audience}</Badge>
              <ActionButton onClick={() => onOpen(run.id)}>
                Open frozen run
              </ActionButton>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.pagination}>
        <span>
          {cursors.length ? "Earlier history" : "Latest history"} · Up to 100
          authorized runs
        </span>
        <div className={styles.actions}>
          <ActionButton
            disabled={!cursors.length}
            onClick={() => setCursors((previous) => previous.slice(0, -1))}
          >
            Newer
          </ActionButton>
          <ActionButton
            disabled={!query.data || query.data.length < 100}
            onClick={() =>
              setCursors((previous) => [
                ...previous,
                query.data!.at(-1)!.generatedAt,
              ])
            }
          >
            Older
          </ActionButton>
        </div>
      </div>
    </StatusPanel>
  );
}
