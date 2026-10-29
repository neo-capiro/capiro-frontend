import { useId, useState } from "react";
import { BriefSectionsView } from "../BriefSectionsView";
import { BriefDate } from "../BriefDate";
import { sectionLabels } from "../contracts";
import type { RetainedRefresh } from "./contracts";
import type { useBriefRefresh } from "./useBriefRefresh";
type Flow = ReturnType<typeof useBriefRefresh>;
export function RefreshReview({
  flow,
  result,
}: {
  flow: Flow;
  result: NonNullable<Flow["result"]>;
}) {
  const p = result.proposal,
    prefix = useId();
  return (
    <>
      <small>
        Snapshot prepared <BriefDate value={p.sourceSnapshot.generatedAt} />.{" "}
        {p.keepUserEdits
          ? "Edited sections preserved."
          : "All sections refreshed."}
      </small>
      <BriefSectionsView
        sections={p.proposed}
        onSource={(i) => {
          const source = document.getElementById(prefix + i);
          source?.scrollIntoView({ block: "nearest" });
          source?.focus();
        }}
      />
      <details>
        <summary>Compare with saved text</summary>
        {p.diff.map((d) => (
          <section key={d.section}>
            <h4>
              {sectionLabels[d.section]} · {d.changed ? "Changed" : "Unchanged"}
            </h4>
            <p>{d.baseText}</p>
            <p>{d.proposedText}</p>
          </section>
        ))}
      </details>
      <RefreshCitations proposal={p} prefix={prefix} />
      {!result.acceptedVersion && !flow.attempt?.refused && (
        <ConfirmRefresh flow={flow} proposal={p} />
      )}
    </>
  );
}
function RefreshCitations({
  proposal,
  prefix,
}: {
  proposal: RetainedRefresh;
  prefix: string;
}) {
  return (
    <>
      <h4>Sources retained with this proposal</h4>
      <ol>
        {proposal.citations.map((c, i) => (
          <li id={prefix + i} key={i} tabIndex={-1}>
            <strong>{c.title}</strong>
            <p>
              {c.originalSourceName ?? c.sourceFamily} · {c.recordId} ·{" "}
              {c.relationshipStrength}
              {c.stage ? " · " + c.stage : ""}
            </p>
            <p>
              Event: <BriefDate value={c.eventDate} /> · Source updated:{" "}
              <BriefDate value={c.sourceUpdatedAt} /> · Retrieved:{" "}
              <BriefDate value={c.retrievedAt} />
            </p>
            {c.locator && <p>{c.locator}</p>}
          </li>
        ))}
      </ol>
    </>
  );
}
function ConfirmRefresh({
  flow,
  proposal: p,
}: {
  flow: Flow;
  proposal: RetainedRefresh;
}) {
  const [confirmed, setConfirmed] = useState<string>();
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={confirmed === p.proposalHash}
          disabled={flow.busy}
          onChange={(e) =>
            setConfirmed(e.target.checked ? p.proposalHash : undefined)
          }
        />{" "}
        I reviewed this exact proposed brief and its citations.
      </label>
      <button
        className="button primary"
        disabled={flow.busy || confirmed !== p.proposalHash || !flow.attempt}
        onClick={() =>
          flow.attempt &&
          void flow.run({ kind: "accept", expected: flow.attempt, review: p })
        }
      >
        Save reviewed refresh as a new version
      </button>
    </>
  );
}
