"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import type { EditorialRow } from "./use-editorial-draft";
export function EditorialActivation({
  row,
  onSaved,
}: {
  row: EditorialRow;
  onSaved: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false);
  const mutation = useCapiroMutation("legiwatch.editorial.activation"),
    history = useCapiroQuery(
      "legiwatch.editorial.history",
      { params: { id: row.id }, query: { limit: 50 } },
      { enabled: historyOpen },
    );
  const activate = async (enabled: boolean) => {
    try {
      await mutation.run({
        params: { id: row.id },
        body: {
          enabled,
          expectedVersion: row.version,
          approvalHash: row.approvalHash,
        },
      });
      onSaved();
    } catch {
      /* Approval is bound to the saved configuration hash. */
    }
  };
  return (
    <section className={styles.form}>
      <h3>Saved configuration review</h3>
      <p>
        Version {row.version} ·{" "}
        {row.config.sendEnabled
          ? "Automatic delivery requested"
          : "Preparation only"}
      </p>
      {row.config.recipients?.map((recipient) => (
        <p key={recipient.email}>
          {recipient.role.toUpperCase()} · {recipient.email}
        </p>
      ))}
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={mutation.pending}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        {row.config.sendEnabled
          ? "Approve this exact saved schedule, source policy and resolved recipient list for automatic delivery."
          : "Activate this saved preparation schedule."}
      </label>
      <div className={styles.actions}>
        <ActionButton
          primary
          disabled={
            !confirmed ||
            !row.config.prepareEnabled ||
            !row.config.dictionaryScopeAccepted ||
            mutation.pending ||
            (row.config.sendEnabled && !row.approvalHash)
          }
          onClick={() => void activate(true)}
        >
          Activate saved configuration
        </ActionButton>
        <ActionButton
          disabled={row.state !== "active" || mutation.pending}
          onClick={() => void activate(false)}
        >
          Pause preparation and delivery
        </ActionButton>
        <ActionButton onClick={() => setHistoryOpen((value) => !value)}>
          Occurrence history
        </ActionButton>
      </div>
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
      {historyOpen && (
        <StatusPanel
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
        >
          {history.data?.items.map((item) => (
            <p key={item.id}>
              {item.createdAt} · {item.state} ·{" "}
              {item.title ?? "Prepared edition"}
            </p>
          ))}
          {history.data?.nextCursor && (
            <p>Showing the latest 50 occurrences.</p>
          )}
        </StatusPanel>
      )}
    </section>
  );
}
