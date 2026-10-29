"use client";
import type {
  ComparisonEvidence,
  ComparisonProjection as Projection,
} from "../../../../shared/capiro/operations/research-comparisons";
import { Badge, Panel } from "../../../../shared/module-ui";
import { safeComparisonSourceUrl } from "./comparison-state";
import styles from "../research.module.css";

function Evidence({ evidence }: { evidence: ComparisonEvidence[] }) {
  return (
    <ul>
      {evidence.map((source, index) => {
        const href = safeComparisonSourceUrl(source.sourceUrl);
        return (
          <li key={`${source.evidenceRefId}:${index}`}>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {source.publisher ?? source.sourceFamily}
              </a>
            ) : (
              <span>Source unavailable</span>
            )}
            <span>
              {" "}
              ·{" "}
              {source.nativeLocator.section ??
                (source.nativeLocator.page !== null
                  ? `Page ${source.nativeLocator.page}`
                  : "No page or section locator")}
            </span>
            <details>
              <summary>Exact evidence</summary>
              <dl>
                <dt>Reference</dt>
                <dd>{source.evidenceRefId}</dd>
                <dt>Revision</dt>
                <dd>{source.sourceRevisionId ?? "Unavailable"}</dd>
                <dt>Occurrence</dt>
                <dd>{source.nativeLocator.occurrenceId ?? "Not specified"}</dd>
                <dt>Content hash</dt>
                <dd>{source.contentHash ?? "Unavailable"}</dd>
                <dt>Edition</dt>
                <dd>{source.edition ?? "Unavailable"}</dd>
                <dt>Observed</dt>
                <dd>{source.observedAt ?? "Unavailable"}</dd>
              </dl>
              {source.reason && <p>{source.reason}</p>}
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function ComparisonProjection({
  projection,
}: {
  projection: Projection;
}) {
  return (
    <Panel
      title="Comparison evidence"
      description="Each subject keeps its own values and source references. Missing values are not zero."
    >
      <div className={styles.content}>
        {!projection.subjects.length && <p>No subjects selected.</p>}
        {!projection.metrics.length && (
          <p>
            No comparable values or selected passages are available for this
            capture.
          </p>
        )}
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption>Selected metrics and passages by subject</caption>
            <thead>
              <tr>
                <th scope="col">Metric / period / unit</th>
                {projection.subjects.map((subject) => (
                  <th scope="col" key={subject.key}>
                    {subject.label}
                    <div>
                      <Badge>{subject.availability}</Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projection.metrics.map((metric) => (
                <tr key={metric.key}>
                  <th scope="row">
                    {metric.label}
                    <div>
                      {metric.period ?? "No period"} ·{" "}
                      {metric.unit ?? "No unit"}
                    </div>
                    <small>{metric.grain}</small>
                  </th>
                  {projection.subjects.map((subject) => {
                    const cell = metric.cells.find(
                      (item) => item.subjectKey === subject.key,
                    );
                    return (
                      <td key={subject.key}>
                        <p>{cell?.value ?? "Unavailable"}</p>
                        <Badge>{cell?.disposition ?? "missing"}</Badge>
                        {cell?.reason && <p>{cell.reason}</p>}
                        {cell?.evidence.length ? (
                          <Evidence evidence={cell.evidence} />
                        ) : (
                          <p>No exact source evidence.</p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {projection.alignments.map((alignment) => (
          <details key={alignment.kind}>
            <summary>
              {alignment.kind}: {alignment.state}
            </summary>
            <p>{alignment.reason}</p>
            {projection.subjects.map((subject) => (
              <section key={subject.key}>
                <h3>{subject.label}</h3>
                <Evidence
                  evidence={alignment.subjectEvidence[subject.key] ?? []}
                />
              </section>
            ))}
          </details>
        ))}
        <ul>
          {projection.limitations.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
