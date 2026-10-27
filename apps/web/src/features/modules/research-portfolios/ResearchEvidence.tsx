import type { ResearchReviewEvidence as Evidence } from "../../../shared/capiro/operations/research-schemas";

/** Captured fields are displayed as text; no source URL or locator is reconstructed. */
export function ResearchEvidenceFields({
  fields,
}: {
  fields: Record<string, unknown>;
}) {
  return (
    <dl>
      {Object.entries(fields).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {typeof value === "string" ? value : JSON.stringify(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ResearchReviewEvidence({
  evidence,
  selected,
  disabled,
  onSelect,
  stance,
}: {
  evidence: readonly Evidence[];
  selected: readonly number[];
  disabled: boolean;
  onSelect: (next: number[]) => void;
  stance: "for" | "against";
}) {
  return (
    <fieldset disabled={disabled}>
      <legend>
        {stance === "for" ? "Supporting evidence" : "Opposing evidence"}
      </legend>
      {!evidence.length && (
        <p>
          No {stance === "for" ? "supporting" : "opposing"} evidence is recorded
          for this review.
        </p>
      )}
      {evidence.map((item, index) => (
        <article key={`${item.sourceRevisionId}:${index}`}>
          <label>
            <input
              type="checkbox"
              checked={selected.includes(index)}
              onChange={(e) =>
                onSelect(
                  e.target.checked
                    ? [...selected, index]
                    : selected.filter((value) => value !== index),
                )
              }
            />
            Use {stance === "for" ? "supporting" : "opposing"} evidence{" "}
            {index + 1}
          </label>
          <p>
            Source revision: <code>{item.sourceRevisionId}</code>
          </p>
          {item.quote !== null ? (
            <blockquote style={{ whiteSpace: "pre-wrap" }}>
              {item.quote}
            </blockquote>
          ) : (
            <p>No quote was recorded.</p>
          )}
          <details>
            <summary>Exact recorded location</summary>
            <ResearchEvidenceFields fields={item.locator} />
          </details>
        </article>
      ))}
    </fieldset>
  );
}
