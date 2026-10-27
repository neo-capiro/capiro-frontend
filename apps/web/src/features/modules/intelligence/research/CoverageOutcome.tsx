import type { z } from "zod";
import type { coverageRecordedOutcome } from "../../../../shared/capiro/operations/defense-product-coverage";

export function CoverageOutcome({
  outcome,
}: {
  outcome?: z.infer<typeof coverageRecordedOutcome>;
}) {
  if (!outcome) return <p>No recorded source outcome is available.</p>;
  return (
    <dl>
      <dt>Current source state</dt>
      <dd>{outcome.sourceState ?? "Not recorded"}</dd>
      <dt>Last source observation</dt>
      <dd>
        {outcome.lastObservation
          ? `${outcome.lastObservation.state} · ${outcome.lastObservation.revisionKind} · ${outcome.lastObservation.observedAt}`
          : "Not recorded"}
      </dd>
      <dt>Last governed resolution for this tenant</dt>
      <dd>
        {outcome.lastGovernedResolution
          ? `${outcome.lastGovernedResolution.decision} · ${outcome.lastGovernedResolution.resolvedAt}`
          : "Not recorded"}
      </dd>
      {outcome.reason && (
        <>
          <dt>Limitations</dt>
          <dd>{outcome.reason}</dd>
        </>
      )}
    </dl>
  );
}
