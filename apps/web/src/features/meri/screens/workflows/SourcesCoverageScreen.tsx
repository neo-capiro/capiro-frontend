import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { MetadataList } from "./MetadataList";
import { ScopeTags } from "./ScopeTags";
import {
  SourceCoverageList,
  type SourceCoverageView,
} from "./SourceCoverageRow";
import { ToolingPanel, type ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec, MetadataRow } from "./types";
import tooling from "./tooling.module.css";

export type SourcesCoverageView = {
  description: string;
  scope: readonly string[];
  bound: { title: string; detail: string };
  sources: readonly SourceCoverageView[];
  passage: ToolingPanelView;
  metadata: readonly MetadataRow[];
  actions: readonly ActionSpec[];
};

/** 12.03 Sources & coverage: what each source contributed, bounded by the applied scope. */
export function SourcesCoverageScreen({
  view,
  backHref,
  unavailable,
}: {
  view: SourcesCoverageView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Sources & coverage"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <ScopeTags label="Applied scope" tags={view.scope} />
      <Notice title={view.bound.title}>{view.bound.detail}</Notice>
      <SourceCoverageList label="Coverage by source" rows={view.sources} />
      <div className={tooling.pair}>
        <ToolingPanel
          panel={view.passage}
          body="large"
          unavailable={unavailable}
        />
        <section
          className={tooling.box}
          data-tone="muted"
          aria-label="Query and source metadata"
        >
          <MetadataList
            label="Query and source metadata"
            rows={view.metadata}
            labelWidth={140}
          />
        </section>
      </div>
      <ActionRow
        label="Evidence actions"
        actions={view.actions}
        unavailable={unavailable}
      />
    </ToolingPage>
  );
}
