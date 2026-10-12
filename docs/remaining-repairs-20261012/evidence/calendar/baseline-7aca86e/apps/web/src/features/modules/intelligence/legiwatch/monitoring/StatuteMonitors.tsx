"use client";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { StatuteMonitorEditor } from "./StatuteMonitorEditor";
export function StatuteMonitors() {
  const query = useCapiroQuery("legiwatch.statute.monitors", {}),
    [selected, setSelected] = useState<string | null>(null);
  const row = query.data?.find((item) => item.id === selected);
  return (
    <div className={styles.form}>
      <p className={styles.banner}>
        Statute monitors inspect a reviewed bill corpus against saved legal
        references. Historical matches establish a baseline; monitoring does not
        activate delivery.
      </p>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.length === 0 && (
          <p>No statute monitors have been promoted from the source import.</p>
        )}
        {query.data?.map((item) => (
          <Panel
            key={item.id}
            title={item.name ?? "Imported statute monitor"}
            actions={<Badge>{item.state.replaceAll("_", " ")}</Badge>}
          >
            <p>
              {item.config.folderIds.length} folders ·{" "}
              {item.config.billIds?.length ?? 0} selected bills ·{" "}
              {item.config.cadence ?? "Cadence needs review"}
            </p>
            <p className={styles.description}>
              Last scan: {item.last_run_at ?? "Never"}
            </p>
            <ActionButton onClick={() => setSelected(item.id)}>
              Review scope and matches
            </ActionButton>
          </Panel>
        ))}
      </StatusPanel>
      {row && (
        <StatuteMonitorEditor
          key={`${row.id}:${row.version}`}
          row={row}
          onClose={() => setSelected(null)}
          onSaved={query.reload}
        />
      )}
    </div>
  );
}
