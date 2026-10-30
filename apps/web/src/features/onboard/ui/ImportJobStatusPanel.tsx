import { Btn, Icon, Spinner, Tag } from "./primitives";
import {
  importItemOutcomeLabel,
  importJobAttentionMessage,
  importJobCountsLine,
  importJobLabel,
  importJobPopulationLine,
  importJobProgress,
  importJobTimestamp,
  importJobTone,
} from "../lib/import-job-status";
import type {
  ImportItemCode,
  ImportJob,
  ImportJobPopulation,
  ImportJobStatus,
} from "../lib/capiro-api";

import type { ImportJobPanelState } from "../lib/import-job-status";
export type { ImportJobPanelState };

const CODE_LABELS: Record<ImportItemCode, string> = {
  NOT_OWN_CLIENT: "Not a client of your firm",
  LDA_CLIENT_NOT_FOUND: "LDA client record not found",
  CLIENT_SLOT_LIMIT: "Client slot limit reached",
  INTERNAL_ERROR: "Import failed — review with Capiro",
};

const TONE = {
  neutral: "neutral",
  blue: "blue",
  notable: "notable",
  success: "success",
  danger: "critical",
} as const;

function statusTag(status: ImportJobStatus) {
  return <Tag tone={TONE[importJobTone(status)]}>{importJobLabel(status)}</Tag>;
}

export function ImportJobStatusPanel({
  state,
  job,
  jobs = [],
  population,
  nextCursor,
  onLoadMore,
  onRefresh,
  onSelectJob,
  errorMessage,
  compact = false,
  managed = false,
}: {
  state: ImportJobPanelState;
  job?: ImportJob | null;
  jobs?: readonly ImportJob[];
  population?: ImportJobPopulation;
  nextCursor?: string | null;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onSelectJob?: (jobId: string) => void;
  errorMessage?: string | null;
  compact?: boolean;
  managed?: boolean;
}) {
  if (state === "loading")
    return (
      <section aria-label="Import job status" role="status" style={box}>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <Spinner size={11} /> Loading import status…
        </span>
      </section>
    );

  if (state === "empty")
    return (
      <section aria-label="Import job status" role="status" style={box}>
        <b style={heading}>No import job yet</b>
        <p style={body}>
          {managed
            ? "Capiro-managed import status appears here once the team records a job for this account."
            : "No import request has been recorded for this account. Starting an import creates the first durable job."}
        </p>
      </section>
    );

  if (state === "unavailable")
    return (
      <section aria-label="Import job status" role="status" style={box}>
        <b style={heading}>Import status unavailable</b>
        <p style={body}>
          This account or session cannot read import status right now. An
          earlier request may already be recorded or still unconfirmed; this
          view cannot verify it. No import is submitted by reading status.
        </p>
      </section>
    );

  if (state === "error")
    return (
      <section aria-label="Import job status" role="alert" style={box}>
        <b style={heading}>Import status could not be loaded</b>
        <p style={body}>
          {errorMessage ??
            "The status request failed. Refresh to read it again."}
        </p>
        {onRefresh && (
          <Btn size="sm" onClick={onRefresh}>
            Refresh status
          </Btn>
        )}
      </section>
    );

  if (!job)
    return (
      <section aria-label="Import job status" role="status" style={box}>
        <p style={body}>
          Select an import job to review its outstanding items.
        </p>
        <JobList jobs={jobs} onSelectJob={onSelectJob} />
      </section>
    );

  const attention = importJobAttentionMessage(job);
  const updated = importJobTimestamp(job.updatedAt);
  const started = importJobTimestamp(job.startedAt);
  const finished = importJobTimestamp(job.finishedAt);
  const progress = importJobProgress(job.counts);
  const pending = job.items.filter((item) => item.outcome === "pending");

  return (
    <section aria-label="Import job status" style={box}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <b style={heading}>Import job</b>
        {statusTag(job.status)}
        {job.stale && <Tag tone="notable">Needs attention</Tag>}
        <span style={{ flex: 1 }} />
        {onRefresh && (
          <Btn size="sm" onClick={onRefresh}>
            Refresh status
          </Btn>
        )}
      </div>

      <div
        aria-label="Import progress"
        style={{ ...progressTrack, marginTop: 10 }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: 99,
            background:
              job.status === "failed"
                ? "var(--critical)"
                : job.status === "completed"
                  ? "var(--success)"
                  : "var(--accent)",
          }}
        />
      </div>
      <p style={{ ...body, marginTop: 8 }} aria-label="Import item counts">
        {importJobCountsLine(job.counts)}
      </p>
      <p style={{ ...body, marginTop: 4 }} aria-label="Import request identity">
        Request <code style={code}>{job.requestId}</code> · target LDA
        registrant {job.ldaRegistrantId} · {job.requestedIds.length} selected id
        {job.requestedIds.length === 1 ? "" : "s"}
      </p>

      {attention && (
        <p role="status" style={attentionStyle}>
          {attention}
        </p>
      )}

      <p style={{ ...body, marginTop: 6 }}>
        {started ? `Started ${started}. ` : ""}
        {updated ? `Updated ${updated}. ` : ""}
        {finished ? `Finished ${finished}. ` : ""}
        {!job.terminal
          ? `Staleness is a review signal only; it never marks this job failed or completed.`
          : "Only per-item outcomes decide completion."}
      </p>

      {!compact && (
        <ItemTable
          job={job}
          pendingIds={pending.map((item) => item.ldaClientId)}
        />
      )}

      {population && (
        <p
          style={{ ...body, marginTop: 10 }}
          aria-label="Import job population"
        >
          {importJobPopulationLine(population)}
        </p>
      )}
      {jobs.length > 1 && (
        <JobList jobs={jobs} selectedId={job.id} onSelectJob={onSelectJob} />
      )}
      {nextCursor && onLoadMore && (
        <Btn size="sm" onClick={onLoadMore}>
          Load older import jobs
        </Btn>
      )}
    </section>
  );
}

function JobList({
  jobs,
  selectedId,
  onSelectJob,
}: {
  jobs: readonly ImportJob[];
  selectedId?: string;
  onSelectJob?: (jobId: string) => void;
}) {
  if (jobs.length === 0 || !onSelectJob) return null;
  return (
    <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
      {jobs.map((job) => (
        <li key={job.id} style={{ padding: "3px 0" }}>
          <button
            type="button"
            aria-current={job.id === selectedId ? "true" : undefined}
            onClick={() => onSelectJob(job.id)}
            style={jobButton}
          >
            <Icon name="ChevronRight" size={11} />
            {importJobLabel(job.status)} · {job.counts.processed}/
            {job.counts.total} items ·{" "}
            {importJobTimestamp(job.createdAt) ?? "unknown time"}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ItemTable({
  job,
  pendingIds,
}: {
  job: ImportJob;
  pendingIds: number[];
}) {
  return (
    <div style={{ marginTop: 12 }}>
      {pendingIds.length > 0 && (
        <p style={attentionStyle} aria-label="Unresolved item ids">
          Unresolved LDA ids requiring operator action: {pendingIds.join(", ")}.
        </p>
      )}
      <ul
        aria-label="Import item outcomes"
        style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 12.5 }}
      >
        {job.items.map((item) => (
          <li
            key={item.ldaClientId}
            style={{ padding: "3px 0", color: "var(--ink-2)" }}
          >
            LDA {item.ldaClientId} — {importItemOutcomeLabel(item.outcome)}
            {item.outcome === "rejected" && item.code
              ? `: ${CODE_LABELS[item.code]}`
              : ""}
            {item.clientName &&
            (item.outcome === "created" || item.outcome === "already_present")
              ? ` (${item.clientName})`
              : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

const box = {
  border: "1px solid var(--border-1)",
  borderRadius: 8,
  background: "var(--bg-surface-2)",
  padding: "12px 14px",
  margin: "10px 0",
  fontSize: 12.5,
  color: "var(--ink-2)",
} as const;
const heading = { fontSize: 13, color: "var(--ink)" } as const;
const body = { margin: "6px 0 0", lineHeight: 1.5 } as const;
const attentionStyle = {
  margin: "8px 0 0",
  padding: "8px 10px",
  borderRadius: 6,
  background: "var(--accent-soft)",
  color: "var(--accent-ink)",
  lineHeight: 1.5,
} as const;
const progressTrack = {
  height: 5,
  background: "var(--bg-sunken)",
  border: "1px solid var(--border-1)",
  borderRadius: 99,
  overflow: "hidden",
} as const;
const code = {
  fontFamily: "var(--font-mono)",
  fontSize: 11.5,
  letterSpacing: 0,
  overflowWrap: "anywhere",
} as const;
const jobButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  border: 0,
  background: "none",
  padding: 0,
  cursor: "pointer",
  color: "var(--accent)",
  fontSize: 12.5,
} as const;
