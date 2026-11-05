import type { ApplicationResult } from "./review-contracts";
import type { Finding } from "./contracts";

export function ApplicationOutcome({
  result,
  findings,
}: {
  result: ApplicationResult;
  findings: Finding[];
}) {
  return (
    <section role="status" className="status" aria-label="Application result">
      <p>
        Application {result.status}: {result.applied.length} applied,{" "}
        {result.alreadyApplied.length} already applied, {result.errors.length}{" "}
        not applied.
      </p>
      {result.errors.length > 0 && (
        <ul>
          {result.errors.map((error) => (
            <li key={error.findingId}>
              {findings.find((f) => f.id === error.findingId)?.targetKey ??
                "Selected finding"}
              : {error.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
