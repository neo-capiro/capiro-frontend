import type { LinkReviewCandidate } from "../../../shared/capiro/operations/settings-admin/analyst-links";
import styles from "../styles";

function SourceLink({ value }: { value: string | null }) {
  if (!value) return <p>Source link unavailable.</p>;
  let safe = false;
  try {
    safe = ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    /* source may be a filename */
  }
  return safe ? (
    <a href={value} target="_blank" rel="noreferrer">
      Open original source
    </a>
  ) : (
    <p>Source reference: {value}</p>
  );
}
export function LinkReviewEvidence({
  candidate,
}: {
  candidate: LinkReviewCandidate;
}) {
  return (
    <section className={styles.stack} aria-label="Candidate evidence">
      <p>Candidate: {candidate.id}</p>
      <p>
        Match basis: {candidate.matchBasis} · Confidence: {candidate.confidence}
      </p>
      <p>
        Program:{" "}
        {candidate.program?.canonicalName ??
          candidate.programId ??
          "Not linked"}
        {candidate.program && " (" + candidate.program.status + ")"}
      </p>
      <p>
        Program element: {candidate.peCode ?? "Not linked"}{" "}
        {candidate.programElement?.title}
        {candidate.programElement?.retiredAt && " (retired)"}
      </p>
      {candidate.projectCode && <p>Project: {candidate.projectCode}</p>}
      {candidate.kind === "provision" ? (
        <>
          <h3>{candidate.source.heading}</h3>
          <p>
            {candidate.source.committee} · FY {candidate.source.fy} · Pages{" "}
            {candidate.source.pageStart ?? "unknown"}–
            {candidate.source.pageEnd ?? "unknown"}
          </p>
          <p>Action: {candidate.source.actionType ?? "Not classified"}</p>
          <pre className={styles.pre}>{candidate.source.text}</pre>
          <p>
            Document: {candidate.source.sourceDocument?.title ?? "Unavailable"}
          </p>
          <SourceLink
            value={candidate.source.sourceDocument?.sourceUrl ?? null}
          />
          {candidate.source.sourceDocument?.sha256 && (
            <p>Document SHA-256: {candidate.source.sourceDocument.sha256}</p>
          )}
          {candidate.source.sourceDocument?.supersededByDocumentId && (
            <p>This document has been superseded by a newer source version.</p>
          )}
        </>
      ) : (
        <>
          <h3>{candidate.source.title}</h3>
          <p>
            Notice: {candidate.source.noticeId} · Solicitation:{" "}
            {candidate.source.solicitationNumber ?? "Not provided"}
          </p>
          <p>
            Type: {candidate.source.noticeType} · Original type:{" "}
            {candidate.source.baseType ?? "Not provided"}
          </p>
          <p>
            Agency: {candidate.source.agency ?? "Not provided"} · Office:{" "}
            {candidate.source.office ?? "Not provided"}
          </p>
          <p>
            Posted: {candidate.source.postedDate ?? "Unknown"} · Response
            deadline: {candidate.source.responseDeadline ?? "Unknown"}
          </p>
          <p>
            Archive date: {candidate.source.archiveDate ?? "Unknown"} · Source
            active: {candidate.source.active ? "Yes" : "No"}
          </p>
          <pre className={styles.pre}>
            {candidate.source.description ?? "Source description unavailable."}
          </pre>
          <SourceLink value={candidate.source.sourceUrl} />
          <p>Last source sync: {candidate.source.lastSyncedAt}</p>
        </>
      )}
      <p>Evidence version: {candidate.version}</p>
    </section>
  );
}
