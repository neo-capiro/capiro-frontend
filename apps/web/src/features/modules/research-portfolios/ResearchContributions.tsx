"use client";
import { useState } from "react";
import type { ResearchAnalyticsProjection } from "../../../shared/capiro/operations/research-schemas";
import { ActionButton, DataTable } from "../../../shared/module-ui";
import { ResearchEvidenceFields } from "./ResearchEvidence";
import styles from "./research.module.css";
type Basis = ResearchAnalyticsProjection["totals"][number]["basis"];
export const researchBasisKey = (basis: Basis | null) => JSON.stringify(basis);
export function researchBasisLabel(basis: Basis | null) {
  return basis
    ? [
        `FY${basis.fundingFiscalYear}`,
        basis.stage,
        basis.metric,
        basis.unit,
        basis.currency,
        basis.requestEdition ?? "Edition not stated",
        basis.priceBasis ?? "Price basis not stated",
        basis.knownAt ? `Known at ${basis.knownAt}` : "Known-at not stated",
      ].join(" · ")
    : "Basis unavailable";
}
export function ResearchContributions({
  projection,
  basisFilter,
  onBasisFilter,
}: {
  projection: ResearchAnalyticsProjection;
  basisFilter: string;
  onBasisFilter: (value: string) => void;
}) {
  const [disposition, setDisposition] = useState("");
  const [source, setSource] = useState("");
  const bases = [
    ...new Map(
      projection.contributions.map((row) => [
        researchBasisKey(row.basis),
        row.basis,
      ]),
    ).entries(),
  ];
  const sources = [
    ...new Set(
      projection.contributions.flatMap((row) => row.sourceRevisionIds),
    ),
  ];
  const rows = projection.contributions.filter(
    (row) =>
      (!basisFilter || researchBasisKey(row.basis) === basisFilter) &&
      (!disposition || row.disposition === disposition) &&
      (!source || row.sourceRevisionIds.includes(source)),
  );
  return (
    <section className={styles.content} aria-label="Contribution ledger">
      <h3>Contribution ledger</h3>
      <p>
        Values and inclusion decisions come from the recorded calculation.
        Missing, withheld, unavailable and incompatible contributions stay
        separate; this view does not recalculate totals.
      </p>
      <div className={styles.actions}>
        <label>
          Basis{" "}
          <select
            value={basisFilter}
            onChange={(e) => onBasisFilter(e.target.value)}
          >
            <option value="">All bases</option>
            {bases.map(([key, basis]) => (
              <option key={key} value={key}>
                {researchBasisLabel(basis)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Disposition{" "}
          <select
            value={disposition}
            onChange={(e) => setDisposition(e.target.value)}
          >
            <option value="">All dispositions</option>
            {[
              "included",
              "excluded",
              "overlap",
              "incompatible",
              "missing",
              "unavailable",
              "withheld",
              // Tracked bills: tracked legislative subjects, not a funding gap or zero.
              "not_applicable",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Source revision{" "}
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All revisions</option>
            {sources.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <ActionButton
          onClick={() => {
            onBasisFilter("");
            setDisposition("");
            setSource("");
          }}
        >
          Clear contribution filters
        </ActionButton>
      </div>
      <p role="status">
        Showing {rows.length} of {projection.contributions.length} recorded
        contributions.
      </p>
      <DataTable
        rows={rows}
        rowKey={(row) => row.contributionId}
        caption="Recorded research portfolio contributions"
        columns={[
          {
            key: "subject",
            label: "Subject",
            render: (row) => (
              <>
                {row.label || row.targetId}
                <div>
                  {row.targetKind} · {row.targetId}
                </div>
              </>
            ),
          },
          {
            key: "value",
            label: "Value and basis",
            render: (row) => (
              <>
                {row.value ?? "No value recorded"}
                <div>{researchBasisLabel(row.basis)}</div>
              </>
            ),
          },
          {
            key: "disposition",
            label: "Disposition",
            render: (row) => (
              <>
                {row.disposition}
                <div>Source: {row.sourceDisposition ?? "Not recorded"}</div>
                <p>{row.reason}</p>
              </>
            ),
          },
          {
            key: "source",
            label: "Recorded evidence",
            render: (row) => (
              <details>
                <summary>Contribution details</summary>
                <dl>
                  <dt>Contribution</dt>
                  <dd>{row.contributionId}</dd>
                  <dt>Member</dt>
                  <dd>{row.memberId}</dd>
                  <dt>Observation</dt>
                  <dd>{row.sourceObservationId ?? "Not recorded"}</dd>
                  <dt>Revisions</dt>
                  <dd>{row.sourceRevisionIds.join(", ") || "Not recorded"}</dd>
                  <dt>Overlaps contribution</dt>
                  <dd>{row.overlapsContributionId ?? "None recorded"}</dd>
                </dl>
                {row.evidence.length ? (
                  row.evidence.map((evidence, index) => (
                    <ResearchEvidenceFields key={index} fields={evidence} />
                  ))
                ) : (
                  <p>
                    No exact evidence fields were recorded for this
                    contribution.
                  </p>
                )}
              </details>
            ),
          },
        ]}
      />
    </section>
  );
}
