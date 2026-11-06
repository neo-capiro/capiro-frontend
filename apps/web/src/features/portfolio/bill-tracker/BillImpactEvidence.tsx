import { Badge } from "@/shared/module-ui";
import type { ImpactAnalysis } from "@/shared/capiro/operations/legiwatch-impact-schemas";
import styles from "./impact-tracker.module.css";

export function EvidenceLink({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  return href && /^https?:\/\//i.test(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children} ↗
    </a>
  ) : (
    <span>{children} · Source link unavailable</span>
  );
}
function Citations({
  title,
  citations,
}: {
  title: string;
  citations: ImpactAnalysis["findings"][number]["provisions"];
}) {
  return (
    <section className={styles.evidence}>
      <h4>{title}</h4>
      {citations.length ? (
        citations.map((citation, index) => (
          <article key={`${citation.sourceId}:${index}`}>
            <EvidenceLink href={citation.sourceUrl}>
              {citation.label}
            </EvidenceLink>
            <p className={styles.muted}>
              {citation.locator} · Revision {citation.revision}
            </p>
            {citation.quote && <blockquote>{citation.quote}</blockquote>}
          </article>
        ))
      ) : (
        <p className={styles.muted}>No supporting evidence available.</p>
      )}
    </section>
  );
}
export function BillImpactEvidence({ impact }: { impact: ImpactAnalysis }) {
  return (
    <section className={styles.section} aria-label="Client impact analysis">
      <div className={styles.toolbar}>
        <h3>Client impact</h3>
        <Badge>{impact.confidence} confidence</Badge>
      </div>
      {impact.stale && (
        <p role="status" className={styles.notice}>
          Needs refresh.{" "}
          {impact.staleReason ?? "The bill or client evidence has changed."}
        </p>
      )}
      {impact.status !== "ready" && (
        <p role="status" className={styles.notice}>
          {impact.status === "needs_evidence"
            ? "More evidence is needed before a client impact can be established."
            : "Client impact analysis is unavailable."}
        </p>
      )}
      <p>{impact.summary}</p>
      <p className={styles.muted}>
        Impact describes possible exposure. The client position is an analyst
        decision.
      </p>
      {impact.analyzedAt && (
        <p className={styles.muted}>
          Analyzed <time dateTime={impact.analyzedAt}>{impact.analyzedAt}</time>
          {impact.model ? ` · ${impact.model}` : ""}
        </p>
      )}
      {impact.findings.map((finding, index) => (
        <article className={styles.finding} key={index}>
          <div className={styles.toolbar}>
            <h4>{finding.title}</h4>
            <Badge>
              {finding.direction} · {finding.confidence} confidence
            </Badge>
          </div>
          <p>{finding.mechanism}</p>
          {finding.conditions.length > 0 && (
            <div>
              <h4>Applies if</h4>
              <ul>
                {finding.conditions.map((condition, i) => (
                  <li key={i}>{condition}</li>
                ))}
              </ul>
            </div>
          )}
          {finding.missingFacts.length > 0 && (
            <div>
              <h4>Still unknown</h4>
              <ul>
                {finding.missingFacts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            </div>
          )}
          <Citations title="Bill provisions" citations={finding.provisions} />
          <Citations title="Client evidence" citations={finding.clientFacts} />
          <div className={styles.notice}>
            <h4>Next action</h4>
            <p>{finding.nextAction}</p>
          </div>
        </article>
      ))}
      {impact.missingFacts.length > 0 && (
        <section>
          <h4>Evidence to add</h4>
          <ul>
            {impact.missingFacts.map((fact, index) => (
              <li key={index}>{fact}</li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
