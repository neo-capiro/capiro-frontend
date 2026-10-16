"use client";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { PanelPair } from "./PanelPair";
import { ScopeTags } from "./ScopeTags";
import type { ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

/** A matrix cell: the observed value and whether it is direct, inferred or unavailable. */
export type OverlapCell = { value: string; basis: string };
export type OverlapDimension = {
  id: string;
  dimension: string;
  cells: readonly OverlapCell[];
};
export type PortfolioOverlapView = {
  description: string;
  scope: readonly string[];
  /** External company first, then each selected client. */
  subjects: readonly string[];
  dimensions: readonly OverlapDimension[];
  clientCoverage: readonly ToolingPanelView[];
  externalCoverage: string;
  actions: readonly ActionSpec[];
};

const cell = (item: OverlapCell | undefined) =>
  item ? (
    <span className={styles.matrixCell}>
      <span>{item.value}</span>
      <span>{item.basis}</span>
    </span>
  ) : null;

/** 12.21 Portfolio overlap matrix: seven dimensions with direct evidence and inference labelled. */
export function PortfolioOverlapScreen({
  view,
  backHref,
  unavailable,
}: {
  view: PortfolioOverlapView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  const columns: readonly DataColumn<OverlapDimension>[] = [
    {
      key: "dimension",
      label: "Dimension",
      width: 190,
      render: (row) => row.dimension,
    },
    ...view.subjects.map((subject, index) => ({
      key: subject,
      label: subject,
      width: 286,
      render: (row: OverlapDimension) => cell(row.cells[index]),
    })),
  ];
  return (
    <ToolingPage
      title="Portfolio overlap"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <ScopeTags label="Resolved comparison scope" tags={view.scope} />
      <Notice title="Illustrative comparison · No implied relationship">
        All matrix values and source references are fictional UI fixtures.
        Similar capabilities, shared mission terms, names or agencies do not
        prove a customer, supplier, partner or personal relationship. No other
        clients are included.
      </Notice>
      <section
        className={`${tooling.box} ${styles.fill}`}
        aria-label="Seven-dimension overlap matrix"
      >
        <DataTable
          caption="Seven-dimension overlap matrix"
          columns={columns}
          rows={view.dimensions}
        />
        <p className={tooling.caption}>
          Direct = retrieved fixture passage · Inference = interpretation of
          cited passages · Unavailable = not checked or inaccessible; never “no
          overlap.”
        </p>
      </section>
      <PanelPair
        label="Per-client comparison coverage"
        panels={view.clientCoverage}
        tone="muted"
        unavailable={unavailable}
      />
      <p className={tooling.caption}>{view.externalCoverage}</p>
      <ActionRow
        label="Overlap result actions"
        actions={view.actions}
        unavailable={unavailable}
      />
    </ToolingPage>
  );
}
