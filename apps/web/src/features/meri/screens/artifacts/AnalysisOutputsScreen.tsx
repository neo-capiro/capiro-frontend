"use client";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { ArtifactCard } from "./ArtifactCard";
import type { ArtifactFile, Heading } from "./types";
import shared from "./artifacts.module.css";
import styles from "./previews.module.css";

export type CommitmentRow = {
  id: string;
  commitment: string;
  due: string;
  status: string;
};
export type AnalysisOutputsView = {
  heading: Heading;
  outputs: readonly ArtifactFile[];
  metric: { label: string; value: string; detail: string };
  commitments: readonly CommitmentRow[];
  provenance: string;
};

const columns: readonly DataColumn<CommitmentRow>[] = [
  {
    key: "commitment",
    label: "Commitment",
    width: 270,
    render: (row) => row.commitment,
  },
  { key: "due", label: "Due", width: 100, render: (row) => row.due },
  { key: "status", label: "Status", width: 158, render: (row) => row.status },
];

/** 03.08 Analysis outputs: reproducible inputs and results kept together with provenance. */
export function AnalysisOutputsScreen({
  view,
  unavailable,
}: {
  view: AnalysisOutputsView;
  unavailable: string;
}) {
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <div className={`${shared.columns} ${shared.wideGap}`}>
        <section
          className={`${shared.stack} ${shared.grow}`}
          aria-label="Analysis outputs"
        >
          {view.outputs.map((file) => (
            <ArtifactCard key={file.id} file={file} unavailable={unavailable} />
          ))}
        </section>
        <section
          className={`${shared.panel} ${styles.summary}`}
          aria-labelledby="analysis-found"
        >
          <h2 id="analysis-found" className={shared.sectionTitle}>
            What the analysis found
          </h2>
          <div className={shared.metric}>
            <p>{view.metric.label}</p>
            <p className={shared.metricValue}>{view.metric.value}</p>
            <p className={shared.caption}>{view.metric.detail}</p>
          </div>
          <DataTable
            caption="Open commitments"
            columns={columns}
            rows={view.commitments}
          />
          <h3 className={shared.panelTitle}>Input provenance</h3>
          <p className={shared.body}>{view.provenance}</p>
          <button
            type="button"
            className={ui.outline}
            disabled
            title={unavailable}
          >
            View source evidence
          </button>
        </section>
      </div>
    </div>
  );
}
