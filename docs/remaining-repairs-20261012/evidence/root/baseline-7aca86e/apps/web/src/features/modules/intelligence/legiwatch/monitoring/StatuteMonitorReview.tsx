"use client";
import { useState } from "react";
import type { z } from "zod";
import type { statuteRule } from "../../../../../shared/capiro/operations/legiwatch-monitor-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Panel,
  StatusPanel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
export function StatuteMonitorReview({
  row,
  onSaved,
}: {
  row: z.infer<typeof statuteRule>;
  onSaved: () => void;
}) {
  const preview = useCapiroMutation("legiwatch.statute.preview"),
    activation = useCapiroMutation("legiwatch.statute.activation"),
    scan = useCapiroMutation("legiwatch.statute.scan");
  const events = useCapiroQuery("legiwatch.statute.events", {
    params: { id: row.id },
  });
  const [confirmed, setConfirmed] = useState(false);
  const pending = preview.pending || activation.pending || scan.pending;
  const inspect = async () => {
    setConfirmed(false);
    try {
      await preview.run({ params: { id: row.id } });
    } catch {
      /* Show incomplete qualification. */
    }
  };
  const update = async (enabled: boolean) => {
    try {
      await activation.run({
        params: { id: row.id },
        body: {
          enabled,
          expectedVersion: row.version,
          ...(enabled
            ? {
                baseline: "from_now" as const,
                previewHash: preview.data?.previewHash,
              }
            : {}),
        },
      });
      onSaved();
    } catch {
      /* Stale preview requires a fresh review. */
    }
  };
  const run = async () => {
    try {
      await scan.run({ params: { id: row.id } });
      events.reload();
    } catch {
      /* Durable state may need refresh. */
    }
  };
  return (
    <section className={styles.form}>
      <ActionButton disabled={pending} onClick={() => void inspect()}>
        Preview exact current corpus
      </ActionButton>
      {preview.data && (
        <>
          <p className={styles.banner}>
            {preview.data.coverage.complete
              ? "The selected corpus passed current qualification."
              : "Source qualification is incomplete."}
          </p>
          {preview.data.gaps.map((gap) => (
            <p className={styles.gap} key={gap}>
              {gap}
            </p>
          ))}
          <p>
            {preview.data.matches.length} retained matches in the reviewed
            corpus.
          </p>
          {preview.data.matches.slice(0, 10).map((match) => (
            <blockquote key={match.id}>
              {match.bill_id} · {match.locator}
              <p>{match.quote}</p>
            </blockquote>
          ))}
          <label className={styles.check}>
            <input
              type="checkbox"
              disabled={pending || !preview.data.coverage.complete}
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Use these historical matches as the baseline and begin matching from
            now.
          </label>
        </>
      )}
      <div className={styles.actions}>
        <ActionButton
          primary
          disabled={pending || !confirmed || !preview.data?.coverage.complete}
          onClick={() => void update(true)}
        >
          Activate reviewed monitor
        </ActionButton>
        <ActionButton
          disabled={pending || row.state !== "active"}
          onClick={() => void update(false)}
        >
          Pause monitor
        </ActionButton>
        <ActionButton
          disabled={pending || row.state !== "active"}
          onClick={() => void run()}
        >
          Scan now
        </ActionButton>
      </div>
      {scan.data && (
        <p role="status">
          Scan {scan.data.state}.{" "}
          {scan.data.added === undefined
            ? "Match count unavailable."
            : `${scan.data.added} new retained matches.`}{" "}
          {scan.data.gaps?.join(" · ")}
        </p>
      )}
      {(preview.error || activation.error || scan.error) && (
        <p role="alert">
          {(activation.error ?? scan.error ?? preview.error)?.message}
        </p>
      )}
      <StatusPanel
        loading={events.loading}
        error={events.error}
        onRetry={events.reload}
      >
        {events.data?.map((event) => (
          <Panel
            key={event.id}
            title={`${event.baseline ? "Baseline" : "New match"} · ${event.payload.bill_id}`}
            description={event.created_at}
          >
            <blockquote>{event.payload.quote}</blockquote>
            <p className={styles.description}>
              {event.payload.locator} · {event.payload.document_revision}
            </p>
          </Panel>
        ))}
      </StatusPanel>
    </section>
  );
}
