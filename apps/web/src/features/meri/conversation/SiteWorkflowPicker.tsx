"use client";
import { ChevronDown } from "lucide-react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  receiveSkillSelection,
  type ConversationSkillSelection,
} from "../../../shared/meri-conversations/query-journal";
import type { SiteWorkflowConfiguration } from "@capiro/shared/site-workflows";
import styles from "../model-selection/model-selection.module.css";

const selector = (row: SiteWorkflowConfiguration) => ({
  siteId: row.manifest.siteId,
  workflowId: row.manifest.workflowId,
  version: row.manifest.version,
  manifestSha256: row.manifestSha256,
});
const identity = (
  value: NonNullable<ConversationSkillSelection["siteWorkflow"]>,
) =>
  JSON.stringify([
    value.siteId,
    value.workflowId,
    value.version,
    value.manifestSha256,
  ]);

/** Selection is retained by the existing draft owner; execution resolves the exact pin again. */
export function SiteWorkflowPicker({
  conversationId,
  selection,
  disabled,
  onChange,
}: {
  conversationId: string;
  selection: ConversationSkillSelection;
  disabled: boolean;
  onChange: (value: ConversationSkillSelection) => void;
}) {
  const query = useCapiroQuery("meri.siteWorkflows.catalog", {
    body: { conversationId },
  });
  const rows = query.data?.workflows.filter((row) => row.enabled) ?? [];
  const chosen = selection.siteWorkflow;
  const current =
    chosen && rows.find((row) => identity(selector(row)) === identity(chosen));
  const stale = !!chosen && !!query.data && !current;
  const choose = (value: string) => {
    if (disabled) return;
    const next = { ...selection };
    if (value === "") delete next.siteWorkflow;
    else {
      const row = rows.find((item) => identity(selector(item)) === value);
      if (!row || query.loading || query.error) return;
      next.siteWorkflow = selector(row);
    }
    onChange(receiveSkillSelection(next));
  };
  return (
    <details className={styles.picker}>
      <summary className={styles.trigger}>
        <span className="sr-only">Website task for next message: </span>
        <span className={styles.value}>
          Website · {chosen?.workflowId ?? "No task"}
        </span>
        <ChevronDown aria-hidden />
      </summary>
      <p className={styles.help}>
        Choose a configured website task for your next message. Access and the
        exact configuration are checked when it runs.
      </p>
      {query.loading && <p role="status">Loading website tasks…</p>}
      {query.error && (
        <p role="alert">Website tasks are unavailable. Refresh to try again.</p>
      )}
      {stale && (
        <p role="alert">
          The selected configuration is no longer available. Choose its current
          version or clear it before sending.
        </p>
      )}
      <label className={styles.field}>
        <span>Website task</span>
        <select
          className={styles.trigger}
          value={chosen ? identity(chosen) : ""}
          disabled={disabled || query.loading || !!query.error}
          onChange={(event) => choose(event.target.value)}
        >
          <option value="">No website task</option>
          {chosen && !current && (
            <option value={identity(chosen)} disabled>
              {chosen.workflowId} · selected version {chosen.version}{" "}
              unavailable
            </option>
          )}
          {rows.map((row) => (
            <option
              key={identity(selector(row))}
              value={identity(selector(row))}
            >
              {row.manifest.siteId} · {row.manifest.workflowId} · version{" "}
              {row.manifest.version}
            </option>
          ))}
        </select>
      </label>
      {current && <p className={styles.help}>{current.manifest.taskSummary}</p>}
      {query.data && rows.length === 0 && (
        <p>No website tasks are enabled for this chat.</p>
      )}
      <div className={styles.recovery}>
        <button
          type="button"
          disabled={disabled || query.loading}
          onClick={query.reload}
        >
          Refresh website tasks
        </button>
        {chosen && (
          <button type="button" disabled={disabled} onClick={() => choose("")}>
            Clear website task
          </button>
        )}
      </div>
    </details>
  );
}
