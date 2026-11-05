import type { PortfolioEvidence } from "./proposal-contracts";
import styles from "./depth.module.css";

export function ProposalEvidence({
  evidence,
}: {
  evidence: PortfolioEvidence[];
}) {
  return (
    <details className={styles.evidence}>
      <summary>Sources and supporting evidence · {evidence.length}</summary>
      {evidence.length === 0 && <p>No source evidence supplied.</p>}
      {evidence.map((source, index) => (
        <article key={`${source.url ?? source.attachmentId}:${index}`}>
          {source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title} ↗
            </a>
          ) : (
            <strong>
              {source.title} ·{" "}
              {source.sourceType === "person"
                ? "Recorded personal evidence"
                : "Supporting document"}
            </strong>
          )}
          <p>{source.excerpt}</p>
          <small>
            {source.sourceType} · Observed{" "}
            <time dateTime={source.observedAt}>
              {new Date(source.observedAt).toLocaleString()}
            </time>
          </small>
        </article>
      ))}
    </details>
  );
}
