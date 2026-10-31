"use client";
import Link from "next/link";
import { useState } from "react";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { EditorialEditor } from "./EditorialEditor";
export function EditorialSchedules() {
  const query = useCapiroQuery("legiwatch.editorial.configurations", {}),
    [selected, setSelected] = useState<string>();
  const row = query.data?.configurations.find((item) => item.id === selected);
  return (
    <div className={styles.form}>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.configurations.length === 0 && (
          <p>No saved briefing schedules are available.</p>
        )}
        {query.data?.configurations.map((item) => (
          <Panel
            key={item.id}
            title={item.source.family.displayName}
            description={item.source_key}
            actions={<Badge>{item.state}</Badge>}
          >
            <p>{item.config.subject ?? "Subject requires review"}</p>
            {item.last_held_reason && (
              <p className={styles.gap}>{item.last_held_reason}</p>
            )}
            <div className={styles.actions}>
              <ActionButton onClick={() => setSelected(item.id)}>
                Review schedule
              </ActionButton>
              {item.latestEdition && (
                <Link
                  className={styles.link}
                  href={`/modules/workspace?draftId=${encodeURIComponent(item.latestEdition.draftId)}`}
                >
                  Open latest edition
                </Link>
              )}
            </div>
          </Panel>
        ))}
      </StatusPanel>
      {row && (
        <EditorialEditor
          key={`${row.id}:${row.version}`}
          row={row}
          onClose={() => setSelected(undefined)}
          onSaved={() => {
            setSelected(undefined);
            query.reload();
          }}
        />
      )}
    </div>
  );
}
