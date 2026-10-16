"use client";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { PanelPair } from "./PanelPair";
import { ToolingPanel, type ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import { WorkflowField } from "./WorkflowField";
import type { ActionSpec } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type BudgetObservation = {
  id: string;
  period: string;
  cycle: string;
  basis: string;
  value: string;
};
export type BudgetComparisonView = {
  subject: string;
  identities: readonly ToolingPanelView[];
  observationsTitle: string;
  observations: readonly BudgetObservation[];
  compatible: ToolingPanelView;
  blocked: ToolingPanelView;
  actions: readonly ActionSpec[];
};

const columns: readonly DataColumn<BudgetObservation>[] = [
  { key: "period", label: "Period", width: 100, render: (row) => row.period },
  { key: "cycle", label: "Cycle", width: 100, render: (row) => row.cycle },
  {
    key: "basis",
    label: "Basis / vehicle",
    width: 350,
    render: (row) => row.basis,
  },
  {
    key: "value",
    label: "Value and authority",
    width: 510,
    render: (row) => row.value,
  },
];

/** 12.08 Budget lines & exact comparison: deltas only between compatible observations. */
export function BudgetComparisonScreen({
  view,
  backHref,
  unavailable,
}: {
  view: BudgetComparisonView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Budget lines & exact comparison"
      description="PE Deep Dive · Exact fiscal periods, stages and source revisions"
      backHref={backHref}
      unavailable={unavailable}
    >
      <WorkflowField
        field={{ label: "Subject & scope", value: view.subject, helper: "" }}
      />
      <PanelPair
        label="Distinct budget identities"
        panels={view.identities}
        unavailable={unavailable}
      />
      <section
        className={`${tooling.box} ${styles.fill}`}
        data-tone="muted"
        aria-labelledby="budget-observations"
      >
        <h2 id="budget-observations" className={tooling.boxTitle}>
          {view.observationsTitle}
        </h2>
        <DataTable
          caption={view.observationsTitle}
          columns={columns}
          rows={view.observations}
        />
      </section>
      <div
        className={tooling.pair}
        role="group"
        aria-label="Allowed and blocked comparisons"
      >
        <ToolingPanel panel={view.compatible} unavailable={unavailable} />
        <ToolingPanel
          panel={view.blocked}
          tone="muted"
          unavailable={unavailable}
        />
      </div>
      <Notice title="Authorization, appropriation and legal status stay distinct">
        A bill reference or quoted text does not establish enactment. Read exact
        jurisdiction, session and bill revision; inspect status and votes
        separately. No recorded vote does not imply passage. Buyer-workspace
        sections retain their own coverage; unsupported canonical-budget data is
        disclosed.
      </Notice>
      <ActionRow
        label="Budget evidence actions"
        actions={view.actions}
        unavailable={unavailable}
      />
    </ToolingPage>
  );
}
