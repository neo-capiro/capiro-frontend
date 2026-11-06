import type { ImpactDetail } from "@/shared/capiro/operations/legiwatch-impact-schemas";
import { EvidenceLink } from "./BillImpactEvidence";
import styles from "./impact-tracker.module.css";
import { billActionDate } from "./hearings";
import {
  ClientFactValue,
  recordLabel,
  SourceRevision,
} from "./impact-presentation";

export function BillSourceDetails({ detail }: { detail: ImpactDetail }) {
  return (
    <div className={styles.section}>
      <section className={styles.section}>
        <h3>Actions</h3>
        {detail.actions.length ? (
          <ol className={styles.timeline}>
            {detail.actions.map((action, index) => (
              <li key={index}>
                <strong>
                  {billActionDate(action.date) ?? "Date unavailable"}
                </strong>
                <p>{action.text}</p>
                {action.sourceUrl && (
                  <EvidenceLink href={action.sourceUrl}>
                    Official action
                  </EvidenceLink>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p>No action history is available.</p>
        )}
      </section>
      <section className={styles.section}>
        <h3>Bill text versions</h3>
        {detail.versions.length ? (
          detail.versions.map((version) => (
            <article className={styles.finding} key={version.id}>
              <EvidenceLink href={version.sourceUrl}>
                {version.label}
                {version.current ? " · Current" : ""}
              </EvidenceLink>
              <p>
                {billActionDate(version.publishedAt) ??
                  "Publication date unavailable"}{" "}
                · {recordLabel(version.completeness)}
              </p>
              <SourceRevision revision={version.contentHash} />
            </article>
          ))
        ) : (
          <p>No verified bill text version is available.</p>
        )}
      </section>
      <section className={styles.section}>
        <h3>Client facts used</h3>
        {detail.clientFacts.length ? (
          detail.clientFacts.map((fact) => (
            <article className={styles.finding} key={fact.id}>
              <h4>{fact.label}</h4>
              <ClientFactValue value={fact.value} />
              <p className={styles.muted}>{recordLabel(fact.kind)}</p>
              <SourceRevision revision={fact.revision} />
              {fact.citations.map((citation, index) => (
                <div key={index}>
                  <EvidenceLink href={citation.sourceUrl}>
                    {citation.label}
                  </EvidenceLink>
                  {citation.quote && citation.quote !== fact.value && (
                    <blockquote>
                      <ClientFactValue value={citation.quote} />
                    </blockquote>
                  )}
                </div>
              ))}
            </article>
          ))
        ) : (
          <p>No verified client facts are available.</p>
        )}
      </section>
    </div>
  );
}
