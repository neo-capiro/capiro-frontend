import type { EffectiveDateRecord } from "./effective-dates";
export function EffectiveDateDetails({
  record,
}: {
  record: EffectiveDateRecord;
}) {
  const source = record.provenance;
  return (
    <details>
      <summary>Effective date provenance</summary>
      <p>
        Publisher effective_on metadata · {record.documentNumber}. Publication
        date: {source.publicationDate}. Observed: {source.observedAt}. Revision{" "}
        {source.revision}.
      </p>
      <p style={{ overflowWrap: "anywhere" }}>
        Projection SHA-256: {source.evidenceHash}
      </p>
      {source.previous && (
        <p>
          Previous observation: {source.previous.date ?? "No supported date"} (
          {source.previous.status}), revision {source.previous.revision},
          observed {source.previous.observedAt}.
        </p>
      )}
      <p>
        <a href={source.sourceUrl} target="_blank" rel="noreferrer">
          Publisher API evidence
        </a>
        {" · "}
        <a href={source.officialPdfUrl} target="_blank" rel="noreferrer">
          Official edition PDF reference
        </a>
      </p>
      <p>
        The PDF is a matching edition reference. Full Dates text and separately
        issued corrections have not been interpreted; this metadata is not
        complete legal-date coverage.
      </p>
    </details>
  );
}
