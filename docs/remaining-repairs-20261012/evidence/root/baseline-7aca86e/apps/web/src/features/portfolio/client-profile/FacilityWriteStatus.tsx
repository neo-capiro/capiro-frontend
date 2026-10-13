"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { useFacilityWriter } from "./useFacilityWriter";

export function FacilityWriteStatus({
  writer,
}: {
  writer: ReturnType<typeof useFacilityWriter>;
}) {
  const unknown = writer.attempt?.status === "unknown";
  return (
    <>
      <QueryState
        error={writer.query.error}
        retry={() => void writer.query.refetch()}
      />
      <QueryState error={writer.error} />
      {writer.changed && !unknown && (
        <p role="status">
          The saved facility changed or is unavailable. Review current
          facilities before editing it.
        </p>
      )}
      {unknown && (
        <p role="status">
          {writer.attempt?.kind === "create"
            ? "Creation result is unknown."
            : "Facility change result is unknown."}{" "}
          The service may have completed the request. Review current facilities
          before deciding on a separate action. This request will not be sent
          again automatically.
        </p>
      )}
      {(unknown || writer.changed) && (
        <div className="stack">
          <button
            type="button"
            className="button"
            disabled={writer.query.isFetching}
            onClick={() => void writer.review()}
          >
            Review current facilities
          </button>
          {writer.reviewed && (
            <>
              <p>
                Current saved locations:{" "}
                {writer.query.data
                  ?.map((facility) => facility.name)
                  .join(", ") || "None returned"}
                .
              </p>
              <p className="muted">
                This read describes current saved state. It cannot identify a
                lost creation receipt or guarantee another device has finished
                writing.
              </p>
              <button type="button" className="button" onClick={writer.restart}>
                {writer.attempt?.kind === "create"
                  ? "Start a separate facility entry"
                  : "Use the reviewed facility"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
