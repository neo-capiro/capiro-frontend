import type { ResearchShareDashboard } from "../../../../shared/capiro/operations/research-share-schemas";
import styles from "./share.module.css";

type Source = ResearchShareDashboard["data"]["sources"][number];

/** Frozen evidence only: expanding a citation performs no request. */
export function SourceEvidence({ sources }: { sources: readonly Source[] }) {
  if (!sources.length)
    return (
      <p className={styles.muted}>
        No captured source evidence is available for this figure.
      </p>
    );
  return (
    <div className={styles.evidence}>
      {sources.map((source) => (
        <details key={source.id}>
          <summary>
            {source.publisher ?? source.sourceFamily ?? "Source"} ·{" "}
            {source.edition ?? source.sourceRevisionId ?? source.id}
          </summary>
          <dl>
            <dt>Evidence reference</dt>
            <dd>{source.evidenceRefId ?? source.id}</dd>
            <dt>Source document</dt>
            <dd>{source.sourceDocumentId ?? "Not captured"}</dd>
            <dt>Source revision</dt>
            <dd>{source.sourceRevisionId ?? "Not captured"}</dd>
            <dt>Source family</dt>
            <dd>{source.sourceFamily ?? "Not captured"}</dd>
            <dt>Publisher</dt>
            <dd>{source.publisher ?? "Not captured"}</dd>
            <dt>Source address</dt>
            <dd>{source.sourceUrl ?? "Not captured"}</dd>
            <dt>Page</dt>
            <dd>{source.nativeLocator?.page ?? "Not captured"}</dd>
            <dt>Section</dt>
            <dd>{source.nativeLocator?.section ?? "Not captured"}</dd>
            <dt>Occurrence</dt>
            <dd>{source.nativeLocator?.occurrenceId ?? "Not captured"}</dd>
            <dt>Content hash</dt>
            <dd>{source.contentHash ?? "Not captured"}</dd>
            <dt>Edition</dt>
            <dd>{source.edition ?? "Not captured"}</dd>
            <dt>Observed at</dt>
            <dd>{source.observedAt ?? "Not captured"}</dd>
          </dl>
        </details>
      ))}
    </div>
  );
}

export function contributionSources(
  dashboard: ResearchShareDashboard,
  revisionIds: readonly string[],
) {
  return dashboard.data.sources.filter((source) =>
    revisionIds.includes(source.sourceRevisionId ?? source.id),
  );
}
