"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function PlannerInbox() {
  const api = useCapiro();
  const query = useCapiroQuery("planner.inbox", {});
  const [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const rows = query.data
    ? Array.isArray(query.data)
      ? query.data
      : query.data.items
    : [];
  const update = async (id: string, read: boolean, archived: boolean) => {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.inbox.update", {
        params: { id },
        body: { read, archived },
      });
      query.reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update inbox.",
      );
    } finally {
      setBusy(false);
    }
  };
  const readAll = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.notifications.read", {});
      query.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to mark read.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel
      title="Inbox"
      description="Activity and updates for the work you can access."
      actions={
        <ActionButton onClick={() => void readAll()} disabled={busy}>
          Mark all read
        </ActionButton>
      }
    >
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
        empty={
          query.data && rows.length === 0 ? "You are all caught up" : undefined
        }
      >
        {rows.map((row) => (
          <article className={styles.listItem} key={row.id}>
            <Badge>{row.read ? "Read" : "Unread"}</Badge>
            <div>
              <h3>{row.event.text}</h3>
              <p className={styles.note}>
                {row.event.kind} ·{" "}
                {new Date(row.event.createdAt).toLocaleString()}
              </p>
            </div>
            <ActionButton
              disabled={busy}
              onClick={() => void update(row.id, !row.read, row.archived)}
            >
              {row.read ? "Mark unread" : "Mark read"}
            </ActionButton>
            <ActionButton
              disabled={busy}
              onClick={() => void update(row.id, row.read, true)}
            >
              Archive
            </ActionButton>
          </article>
        ))}
      </StatusPanel>
    </Panel>
  );
}
