"use client";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import surfaces from "../../ui/surfaces.module.css";
import styles from "./sources.module.css";

export type SourceQueryRow = {
  id: string;
  query: string;
  results: string;
  coverage: string;
  limitation: string;
};
export type CoverageDetailsView = {
  delay: { title: string; detail: string };
  queries: readonly SourceQueryRow[];
  historical: { title: string; detail: string };
};

const columns: readonly DataColumn<SourceQueryRow>[] = [
  {
    key: "query",
    label: "Source query",
    width: 360,
    render: (row) => row.query,
  },
  {
    key: "results",
    label: "Results",
    width: 170,
    render: (row) => row.results,
  },
  {
    key: "coverage",
    label: "Coverage",
    width: 180,
    render: (row) => row.coverage,
  },
  {
    key: "limitation",
    label: "Limitation",
    width: 442,
    render: (row) => row.limitation,
  },
];

/** 05.03 Freshness, partial and historical results: what was searched and where evidence is limited. */
export function CoverageDetailsScreen({
  view,
  connectorsHref,
  currentEvidenceHref,
  unavailable,
}: {
  view: CoverageDetailsView;
  connectorsHref?: string | undefined;
  currentEvidenceHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Coverage details"
        description="What was searched and where the evidence is limited"
      />
      <Notice
        tone="warning"
        title={view.delay.title}
        action={
          <LinkAction
            variant="outline"
            href={connectorsHref}
            unavailable={unavailable}
          >
            View connectors
          </LinkAction>
        }
      >
        {view.delay.detail}
      </Notice>
      <DataTable
        caption="Source queries, results and coverage limits"
        columns={columns}
        rows={view.queries}
      />
      <section
        className={`${surfaces.panel} ${styles.historical}`}
        aria-labelledby="historical-source"
      >
        <h2 id="historical-source" className={surfaces.largeTitle}>
          {view.historical.title}
        </h2>
        <p className={panel.body}>{view.historical.detail}</p>
        <LinkAction
          variant="primary"
          href={currentEvidenceHref}
          unavailable={unavailable}
        >
          Open current evidence
        </LinkAction>
      </section>
      <p className={`${surfaces.small} ${ui.muted}`}>
        No matches means none were returned within the checked scope and period.
        It does not assert that no records exist elsewhere.
      </p>
    </div>
  );
}
