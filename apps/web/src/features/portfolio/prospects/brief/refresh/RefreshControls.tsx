import { useState } from "react";
import type { useBriefRefresh } from "./useBriefRefresh";
type Flow = ReturnType<typeof useBriefRefresh>;
export function RefreshControls({
  flow,
  versionNumber,
  result,
}: {
  flow: Flow;
  versionNumber: number;
  result: Flow["result"];
}) {
  if (!flow.ready)
    return (
      <button className="button" onClick={flow.retryRecovery}>
        Restore refresh recovery
      </button>
    );
  if (!flow.attempt)
    return <PrepareControls flow={flow} versionNumber={versionNumber} />;
  return <PendingControls flow={flow} result={result} />;
}
function PrepareControls({
  flow,
  versionNumber,
}: {
  flow: Flow;
  versionNumber: number;
}) {
  const [keep, setKeep] = useState(true);
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={keep}
          onChange={(e) => setKeep(e.target.checked)}
        />{" "}
        Preserve my edited sections and their original citations
      </label>
      <button
        className="button"
        disabled={flow.busy}
        onClick={() =>
          void flow.run({
            kind: "prepare",
            expectedVersionNumber: versionNumber,
            keepUserEdits: keep,
          })
        }
      >
        Prepare comparison
      </button>
    </>
  );
}
function PendingControls({
  flow,
  result,
}: {
  flow: Flow;
  result: Flow["result"];
}) {
  const attempt = flow.attempt!;
  return (
    <>
      <p>
        Prepared from version {attempt.request.expectedVersionNumber}.{" "}
        {attempt.acceptHash
          ? "Acceptance requested; check the original result before starting another refresh."
          : "No new brief version has been requested."}
      </p>
      <div className="row">
        <button
          className="button"
          disabled={flow.busy}
          onClick={() => void flow.run({ kind: "check", expected: attempt })}
        >
          Check original status
        </button>
        <button
          className="button"
          disabled={flow.busy}
          onClick={() => void flow.run({ kind: "retry", expected: attempt })}
        >
          Retry original request
        </button>
        {(result?.acceptedVersion ||
          !attempt.acceptHash ||
          attempt.refused) && (
          <button
            className="button"
            disabled={flow.busy || !result}
            onClick={() => void flow.run({ kind: "clear", expected: attempt })}
          >
            {result?.acceptedVersion ? "Finish" : "Discard comparison"}
          </button>
        )}
      </div>
    </>
  );
}
