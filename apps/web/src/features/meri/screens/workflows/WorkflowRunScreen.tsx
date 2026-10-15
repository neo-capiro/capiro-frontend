import { ActionRow } from "./ActionRow";
import { MetadataList } from "./MetadataList";
import { PanelPair } from "./PanelPair";
import { ScopeTags } from "./ScopeTags";
import {
  SourceCoverageList,
  type SourceCoverageView,
} from "./SourceCoverageRow";
import type { ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec, MetadataRow } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type WorkflowRunView = {
  description: string;
  status: string;
  workflow: string;
  context: readonly ToolingPanelView[];
  timeline: readonly MetadataRow[];
  activity: readonly SourceCoverageView[];
  controls: readonly ActionSpec[];
  note: string;
};

/** 12.08 Workflow run & recovery: bound invocation, verified checkpoint and supported activity. */
export function WorkflowRunScreen({
  view,
  backHref,
  unavailable,
}: {
  view: WorkflowRunView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Workflow activity"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <div className={styles.inline}>
        <ScopeTags label="Current run status" tags={[view.status]} />
        <p className={tooling.boxTitle}>{view.workflow}</p>
      </div>
      <PanelPair
        label="Bound workflow and recovery context"
        panels={view.context}
        tone="muted"
        unavailable={unavailable}
      />
      <MetadataList
        label="Acknowledgement and execution timeline"
        rows={view.timeline}
        labelWidth={220}
        strongLabels
      />
      <SourceCoverageList
        label="Supported tool activity"
        rows={view.activity}
      />
      <ActionRow
        label="Run controls"
        actions={view.controls}
        unavailable={unavailable}
      />
      <p className={tooling.caption}>{view.note}</p>
    </ToolingPage>
  );
}
