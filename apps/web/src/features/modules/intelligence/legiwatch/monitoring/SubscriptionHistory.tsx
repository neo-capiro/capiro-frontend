"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Modal,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { ReportRunView } from "../reports/ReportRunView";
export function SubscriptionHistory({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("legiwatch.subscription.history", {
      params: { id },
    }),
    retry = useCapiroMutation("legiwatch.subscription.retry");
  const [runId, setRunId] = useState<string>();
  const repeat = async (occurrenceId: string) => {
    try {
      await retry.run({ params: { id: occurrenceId } });
      query.reload();
    } catch {
      /* Held state remains visible. */
    }
  };
  return (
    <Modal
      open
      title="Subscription occurrences"
      side="right"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {runId ? (
        <ReportRunView runId={runId} onBack={() => setRunId(undefined)} />
      ) : (
        <div className={styles.form}>
          <ActionButton onClick={query.reload}>
            Refresh occurrence history
          </ActionButton>
          <StatusPanel
            loading={query.loading}
            error={query.error}
            onRetry={query.reload}
          >
            {query.data?.length === 0 && (
              <p>No occurrences have been prepared.</p>
            )}
            {query.data?.map((item) => (
              <Panel
                key={item.id}
                title={item.intendedAt}
                actions={<Badge>{item.state}</Badge>}
              >
                <p>
                  {item.windowStart} – {item.windowEnd} · {item.attempts}{" "}
                  attempts
                </p>
                {item.error && <p className={styles.gap}>{item.error}</p>}
                <div className={styles.actions}>
                  {item.runId && (
                    <ActionButton onClick={() => setRunId(item.runId!)}>
                      Open frozen report
                    </ActionButton>
                  )}
                  {item.state === "held" && (
                    <ActionButton
                      disabled={retry.pending}
                      onClick={() => void repeat(item.id)}
                    >
                      Retry held occurrence as a draft
                    </ActionButton>
                  )}
                </div>
              </Panel>
            ))}
          </StatusPanel>
          {retry.error && <p role="alert">{retry.error.message}</p>}
        </div>
      )}
    </Modal>
  );
}
