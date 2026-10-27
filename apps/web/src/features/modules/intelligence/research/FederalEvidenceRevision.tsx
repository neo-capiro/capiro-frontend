import type { z } from "zod";
import type { federalEvidenceSide } from "../../../../shared/capiro/operations/federal-evidence";
import { SourceLink } from "./ResearchEvidence";
type Side = z.infer<typeof federalEvidenceSide>;

export function admitsFederalSide(
  expectedRevision: string | null,
  side?: Side,
) {
  return Boolean(
    expectedRevision &&
    side &&
    side.revisionId === expectedRevision &&
    side.contentHash &&
    side.availability !== "unavailable",
  );
}

export function FederalEvidenceRevision({
  label,
  expectedRevision,
  side,
}: {
  label: "Before" | "After";
  expectedRevision: string | null;
  side?: Side;
}) {
  const admitted = admitsFederalSide(expectedRevision, side);
  return (
    <section aria-label={`${label} recorded evidence`}>
      <h4>{label}</h4>
      {!admitted || !side ? (
        <>
          <p>
            {label} evidence is unavailable, lacks a content hash, or does not
            match this event&apos;s revision.
          </p>
          {side?.reason && <p>{side.reason}</p>}
        </>
      ) : (
        <>
          <p>
            {side.availability} · Historical event evidence; this does not
            establish current publication eligibility.
          </p>
          {side.reason && <p>{side.reason}</p>}
          <dl>
            <dt>Revision</dt>
            <dd>{side.revisionId}</dd>
            <dt>Content hash</dt>
            <dd>{side.contentHash}</dd>
            <dt>Extraction hash</dt>
            <dd>{side.extractionHash ?? "Not retained"}</dd>
            <dt>Language hash</dt>
            <dd>{side.languageHash ?? "Not retained"}</dd>
            <dt>Qualification</dt>
            <dd>{side.qualificationState ?? "Not supplied"}</dd>
            <dt>Locator</dt>
            <dd>{side.locator ?? "Not retained"}</dd>
            <dt>Text offsets</dt>
            <dd>
              {side.textSpan
                ? `${side.textSpan.start}–${side.textSpan.end}`
                : "Not retained"}
            </dd>
            <dt>Published / modified</dt>
            <dd>
              {side.publishedAt ?? "Not retained"} ·{" "}
              {side.sourceModifiedAt ?? "Not retained"}
            </dd>
          </dl>
          {side.evidence ? (
            <blockquote>{side.evidence}</blockquote>
          ) : (
            <p>No text excerpt was retained for this revision.</p>
          )}
          <SourceLink url={side.sourceUrl} />
        </>
      )}
    </section>
  );
}
