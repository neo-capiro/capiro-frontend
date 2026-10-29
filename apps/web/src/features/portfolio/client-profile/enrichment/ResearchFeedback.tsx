import type { useResearchStart } from "./useResearchStart";
export function ResearchFeedback({
  research,
}: {
  research: ReturnType<typeof useResearchStart>;
}) {
  const error =
    research.retained.error ??
    research.start.error?.message ??
    research.recover.error?.message;
  return (
    <>
      {research.start.isPending && (
        <p role="status">Starting the selected research…</p>
      )}
      {error && <p role="alert">{error}</p>}
      {research.retained.record && (
        <div role="status">
          <p>
            A research request needs recovery. Its original sources, documents
            and identity choices are saved.
          </p>
          <button
            className="button"
            disabled={research.busy}
            onClick={() => research.recover.mutate()}
          >
            Recover research request
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
