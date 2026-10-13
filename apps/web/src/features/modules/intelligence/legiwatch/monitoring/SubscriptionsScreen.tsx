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
import { SubscriptionEditor } from "./SubscriptionEditor";
import { SubscriptionHistory } from "./SubscriptionHistory";
export function SubscriptionsScreen() {
  const query = useCapiroQuery("legiwatch.subscriptions", {}),
    reports = useCapiroQuery("legiwatch.reports", {});
  const [selected, setSelected] = useState<string | null>(null),
    [history, setHistory] = useState<string>();
  const row = query.data?.find((item) => item.id === selected);
  return (
    <div className={styles.form} data-figma-node="923:178716">
      <div className={styles.actions}>
        <ActionButton primary onClick={() => setSelected("new")}>
          New daily subscription
        </ActionButton>
        <ActionButton onClick={query.reload}>
          Refresh subscriptions
        </ActionButton>
      </div>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data?.length === 0 && (
          <p>No daily subscriptions have been configured.</p>
        )}
        {query.data?.map((item) => (
          <Panel
            key={item.id}
            title={item.subject}
            actions={<Badge>{item.enabled ? "Active" : "Paused"}</Badge>}
          >
            <p>
              {reports.data?.find((report) => report.id === item.reportId)
                ?.name ?? item.reportId}{" "}
              ·{" "}
              {item.mode === "draft" ? "Prepare drafts" : "Automatic delivery"}{" "}
              · {String(Math.floor(item.localMinutes / 60)).padStart(2, "0")}:
              {String(item.localMinutes % 60).padStart(2, "0")} {item.timezone}
            </p>
            <p className={styles.description}>
              Next due: {item.nextDueAt ?? "Not scheduled"}
            </p>
            <div className={styles.actions}>
              <ActionButton onClick={() => setSelected(item.id)}>
                Review settings
              </ActionButton>
              <ActionButton onClick={() => setHistory(item.id)}>
                Occurrence history
              </ActionButton>
            </div>
          </Panel>
        ))}
      </StatusPanel>
      {(selected === "new" || row) && (
        <SubscriptionEditor
          key={row ? `${row.id}:${row.version}` : "new"}
          row={row}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            query.reload();
          }}
        />
      )}
      {history && (
        <SubscriptionHistory
          id={history}
          onClose={() => setHistory(undefined)}
        />
      )}
    </div>
  );
}
