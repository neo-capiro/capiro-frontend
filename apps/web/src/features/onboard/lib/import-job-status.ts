import type {
  ImportJob,
  ImportJobCounts,
  ImportJobPopulation,
  ImportJobStatus,
  ImportItemOutcome,
} from "@/shared/capiro/onboard-contracts";

export type ImportJobTone =
  | "neutral"
  | "blue"
  | "notable"
  | "success"
  | "danger";
export type ImportJobPanelState =
  | "loading"
  | "empty"
  | "unavailable"
  | "error"
  | "ready";
export type ImportJobReadFailure = "unavailable" | "error";

/** One explicit surface state; failures must hide any stale job content. */
export function deriveImportJobPanelState({
  ready,
  loading,
  failure,
  totalJobs,
}: {
  ready: boolean;
  loading: boolean;
  failure: ImportJobReadFailure | null;
  totalJobs: number;
}): ImportJobPanelState {
  if (!ready || loading) return "loading";
  if (failure === "unavailable") return "unavailable";
  if (failure === "error") return "error";
  return totalJobs === 0 ? "empty" : "ready";
}

const LABELS: Record<ImportJobStatus, string> = {
  queued: "Queued",
  running: "Running",
  partially_completed: "Partially completed",
  failed: "Failed",
  completed: "Completed",
};

const TONES: Record<ImportJobStatus, ImportJobTone> = {
  queued: "neutral",
  running: "blue",
  partially_completed: "notable",
  failed: "danger",
  completed: "success",
};

const OUTCOME_LABELS: Record<ImportItemOutcome, string> = {
  pending: "Outstanding",
  created: "Created",
  already_present: "Already present",
  rejected: "Rejected",
};

export function importJobLabel(status: ImportJobStatus): string {
  return LABELS[status];
}

export function importJobTone(status: ImportJobStatus): ImportJobTone {
  return TONES[status];
}

export function importItemOutcomeLabel(outcome: ImportItemOutcome): string {
  return OUTCOME_LABELS[outcome];
}

/**
 * Staleness is operator attention for an unfinished job. It never proves
 * failure or completion, and elapsed time never changes the status.
 */
export function importJobNeedsAttention(
  job: Pick<ImportJob, "status" | "terminal" | "stale" | "counts">,
): boolean {
  return !job.terminal && (job.stale || job.counts.outstanding > 0);
}

export function importJobProgress(counts: ImportJobCounts): number {
  if (counts.total === 0) return 0;
  return Math.min(100, Math.round((counts.processed / counts.total) * 100));
}

export function importJobOutstandingLabel(
  counts: ImportJobCounts,
): string | null {
  if (counts.outstanding === 0) return null;
  return `${counts.outstanding} of ${counts.total} item${
    counts.total === 1 ? "" : "s"
  } still unresolved`;
}

export function importJobCountsLine(counts: ImportJobCounts): string {
  return `${counts.processed} of ${counts.total} processed · ${counts.created} created · ${counts.alreadyPresent} already present · ${counts.rejected} rejected · ${counts.outstanding} outstanding`;
}

export function importJobTimestamp(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Task-card status derived ONLY from the durable job, never from client counts. */
export function importJobTaskStatus(
  job: Pick<ImportJob, "status" | "terminal" | "stale" | "counts"> | null,
): "none" | "progress" | "done" | "waiting" {
  if (!job) return "none";
  if (job.status === "completed") return "done";
  if (job.status === "failed" || job.status === "partially_completed")
    return "progress";
  if (job.stale || job.counts.outstanding > 0) return "waiting";
  return "progress";
}

export function importJobAttentionMessage(
  job: Pick<ImportJob, "status" | "terminal" | "stale" | "counts">,
): string | null {
  if (job.terminal) {
    if (job.status === "partially_completed")
      return "Some items were rejected. Review the item outcomes below; unresolved items require operator action.";
    if (job.status === "failed")
      return "No item could be imported. Review the rejected codes before trying a different selection.";
    return null;
  }
  if (job.stale)
    return "This import has not reported progress recently. Its result is unconfirmed: do not submit it again. Ask a Capiro operator to review this same job.";
  return "This import has unfinished items. Its result is unconfirmed: do not submit it again. Refresh status or ask a Capiro operator to review this same job.";
}

export function importJobPopulationLine(
  population: ImportJobPopulation,
): string {
  return `${population.total} import job${
    population.total === 1 ? "" : "s"
  } · ${population.completed} completed · ${population.partially_completed} partial · ${
    population.failed
  } failed · ${population.running} running · ${population.queued} queued`;
}

/** Newest job in a page without assuming server ordering beyond the cursor. */
export function newestImportJob(jobs: readonly ImportJob[]): ImportJob | null {
  let newest: ImportJob | null = null;
  for (const job of jobs) {
    if (!newest || Date.parse(job.createdAt) > Date.parse(newest.createdAt))
      newest = job;
  }
  return newest;
}
