import type { ResearchShareDashboard } from "../../../../shared/capiro/operations/research-share-schemas";
import { basisLabel, formatTotal } from "./DashboardWidgets";
import { widgetDefinition } from "./dashboard-layout";
import { SourceEvidence } from "./SourceEvidence";
import styles from "./share.module.css";

/** Describes the received frozen payload, including data beyond the currently visible widgets. */
export function ShareExposure({
  dashboard,
}: {
  dashboard: ResearchShareDashboard;
}) {
  const { data } = dashboard;
  return (
    <section
      className={styles.exposure}
      aria-label="Everything the link will expose"
    >
      <h3>Everything the link will expose</h3>
      <p>
        Prepared for {dashboard.preparedFor.clientName}; snapshot{" "}
        {dashboard.snapshot.name}, captured{" "}
        {new Date(dashboard.snapshot.capturedAt).toLocaleString()}.
      </p>
      <p>
        {dashboard.branding
          ? `Branding: ${dashboard.branding.firmName}${dashboard.branding.logoAvailable ? " and its logo" : "; no logo is available"}.`
          : "No firm name or logo."}
      </p>
      <details>
        <summary>{dashboard.layout.widgets.length} widgets</summary>
        <ul>
          {dashboard.layout.widgets.map((widget) => (
            <li key={widget.id}>{widgetDefinition(widget.kind).label}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary>{data.subjects.length} subjects</summary>
        <ul>
          {data.subjects.map((subject) => (
            <li key={subject.id}>
              {subject.label ?? subject.targetId} · {subject.targetKind} ·{" "}
              {subject.targetId} · {subject.disposition}
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>
          {data.totals.length} totals and {data.contributions.length}{" "}
          contribution figures
        </summary>
        <ul>
          {data.totals.map((total, index) => (
            <li key={index}>
              {formatTotal(total)} · {basisLabel(total.basis)}
            </li>
          ))}
          {data.contributions.map((row) => (
            <li key={row.contributionId}>
              {row.label ?? row.targetId}: {row.value ?? "Unavailable"}
              {row.basis ? ` · ${basisLabel(row.basis)}` : ""} ·{" "}
              {row.disposition} · {row.reason}
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>{data.sources.length} source references</summary>
        <SourceEvidence sources={data.sources} />
      </details>
      <details>
        <summary>{data.changes.length} captured changes</summary>
        <ul>
          {data.changes.map((change) => (
            <li key={change.id}>
              {change.occurredAt} · {change.eventKind} · {change.summary}
            </li>
          ))}
        </ul>
      </details>
      {data.clientFit && (
        <details>
          <summary>Selected client fit and basis</summary>
          <p>
            {data.clientFit.availability} · Score{" "}
            {data.clientFit.fitScore ?? "Unavailable"} · Refreshed{" "}
            {data.clientFit.refreshedAt ?? "Not captured"}
          </p>
          <pre>{JSON.stringify(data.clientFit.basis, null, 2)}</pre>
        </details>
      )}
      {data.comparison && (
        <details>
          <summary>Comparison with {data.comparison.snapshotName}</summary>
          <p>Captured {data.comparison.capturedAt}</p>
          <ul>
            {data.comparison.totals.map((total, index) => (
              <li key={index}>
                {formatTotal(total)} · {basisLabel(total.basis)}
              </li>
            ))}
          </ul>
        </details>
      )}
      {data.limitations.length > 0 && (
        <ul>
          {data.limitations.map((limitation, index) => (
            <li key={index}>{limitation}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
