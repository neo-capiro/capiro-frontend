"use client";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { PanelPair } from "./PanelPair";
import { ScopeTags } from "./ScopeTags";
import { ToolingPanel, type ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

/** One roadmap lane: the next action and which date band holds it. */
export type RoadmapLane = {
  id: string;
  lane: string;
  bands: readonly [string, string, string];
};
export type CompanyResearchView = {
  description: string;
  scope: readonly string[];
  capabilities: ToolingPanelView;
  rails: readonly ToolingPanelView[];
  gaps: string;
  bandLabels: readonly [string, string, string];
  roadmap: readonly RoadmapLane[];
  coverage: string;
  actions: readonly ActionSpec[];
};

const roadmapColumns = (
  labels: readonly [string, string, string],
): readonly DataColumn<RoadmapLane>[] => [
  {
    key: "lane",
    label: "Evidence & next action",
    width: 230,
    render: (row) => row.lane,
  },
  ...labels.map((label, index) => ({
    key: `band-${index}`,
    label,
    width: 272,
    render: (row: RoadmapLane) => row.bands[index],
  })),
];

/** 12.20 Company research & capture roadmap: grounded capabilities, separate money rails and a dated plan. */
export function CompanyResearchScreen({
  view,
  backHref,
  unavailable,
}: {
  view: CompanyResearchView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Company research"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <ScopeTags label="Research subject and horizon" tags={view.scope} />
      <Notice title="Illustrative result · No current company claims">
        All company facts, amounts, identifiers, client comparisons and
        citations on these screens are fictional fixtures. Legal entity/domain
        are confirmed against DEMO-ID-01 before research. This result shows the
        selected starter contract and its source limits.
      </Notice>
      <ToolingPanel panel={view.capabilities} unavailable={unavailable} />
      <PanelPair
        label="Awarded money and future opportunity rails"
        panels={view.rails}
        body="large"
        unavailable={unavailable}
      />
      <p className={`${tooling.small} ${tooling.muted}`}>{view.gaps}</p>
      <section
        className={`${tooling.box} ${styles.fill}`}
        aria-labelledby="roadmap-title"
      >
        <h2 id="roadmap-title" className={tooling.boxTitle}>
          90-day plan → Long-range roadmap
        </h2>
        <DataTable
          caption="Sourced 90-day plan and long-range roadmap"
          columns={roadmapColumns(view.bandLabels)}
          rows={view.roadmap}
        />
      </section>
      <p className={tooling.caption}>{view.coverage}</p>
      <ActionRow
        label="Research result actions"
        actions={view.actions}
        unavailable={unavailable}
      />
    </ToolingPage>
  );
}
