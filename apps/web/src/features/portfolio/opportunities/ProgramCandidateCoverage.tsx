import type { ProgramPage } from "./contracts";

export function ProgramCandidateCoverage({
  data,
}: {
  data: Pick<ProgramPage, "candidateCoverage" | "total">;
}) {
  const coverage = data.candidateCoverage;
  return (
    <div className="muted" aria-label="Program discovery coverage">
      {!coverage ? (
        <p>
          Discovery coverage is unknown. The service did not supply coverage
          information; completeness of the returned total cannot be established.
        </p>
      ) : (
        <>
          <p>
            <strong>
              {coverage.complete
                ? "Discovery complete for the configured paths."
                : "Discovery incomplete."}
            </strong>{" "}
            {coverage.evaluated} candidates evaluated (limit {coverage.limit}).{" "}
            At least {coverage.discoveredAtLeast} candidates discovered.
          </p>
          <p>
            {data.total} matching results
            {coverage.totalScope === "evaluated_candidates"
              ? " within the evaluated subset. Ranking applies only within that subset, not across all programs."
              : " across the discovered candidates."}
          </p>
          {coverage.truncatedPaths.length > 0 && (
            <p>
              Paths reaching the discovery limit:{" "}
              {coverage.truncatedPaths
                .map((path) => path.replaceAll("_", " "))
                .join(", ")}
              .
            </p>
          )}
          {coverage.omittedPaths.length > 0 && (
            <p>
              Paths omitted:{" "}
              {coverage.omittedPaths
                .map((path) => path.replaceAll("_", " "))
                .join(", ")}
              .
            </p>
          )}
        </>
      )}
      <p>
        Coverage describes the configured discovery paths and their bounded
        source text, not the full program catalog, source freshness or funding.
      </p>
    </div>
  );
}
