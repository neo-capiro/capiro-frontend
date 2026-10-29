import type { useResearchCommands } from "./useResearchCommands";
export function ResearchFeedback({
  research,
  runId,
}: {
  research: ReturnType<typeof useResearchCommands>;
  runId?: string;
}) {
  const error = research.retained.error ?? research.error?.message;
  const saved = research.retained.record;
  const retryPending = Boolean(saved && !("input" in saved.command));
  const result = research.result?.runId === runId ? research.result : undefined;
  return (
    <>
      {research.mutation.isPending && (
        <p role="status">
          {research.mutation.variables?.kind === "retry"
            ? "Requesting the task retry…"
            : "Starting the selected research…"}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <p role="status">
          {result.status === "queued"
            ? "Retry queued. The task ledger shows its current progress."
            : "Retry refused. " + result.reason}
        </p>
      )}
      {saved && (
        <div role="status">
          <p>
            {retryPending
              ? "A task retry needs recovery. The original task and attempt are saved."
              : "A research request needs recovery. Its original sources, documents and identity choices are saved."}
          </p>
          <button
            className="button"
            disabled={research.busy}
            onClick={() => research.recover.mutate()}
          >
            {retryPending ? "Recover task retry" : "Recover research request"}
          </button>
        </div>
      )}
      {research.retained.error && (
        <button
          className="button"
          disabled={research.busy}
          onClick={research.retained.retry}
        >
          Check research recovery
        </button>
      )}
    </>
  );
}
