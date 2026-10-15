import { ActionRow } from "./ActionRow";
import { ScopeTags } from "./ScopeTags";
import {
  SourceCoverageList,
  type SourceCoverageView,
} from "./SourceCoverageRow";
import { ToolingPanel, type ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type PortfolioChangesView = {
  description: string;
  scope: readonly string[];
  window: string;
  clients: readonly SourceCoverageView[];
  changes: ToolingPanelView;
  carryover: ToolingPanelView;
  draft: ToolingPanelView;
  draftActions: readonly ActionSpec[];
};

/** 12.11 Client & portfolio changes: every permitted client, new events and carryover kept apart. */
export function PortfolioChangesScreen({
  view,
  backHref,
  unavailable,
}: {
  view: PortfolioChangesView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Client & portfolio changes"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <ScopeTags label="Change review boundaries" tags={view.scope} />
      <p className={tooling.caption}>{view.window}</p>
      <SourceCoverageList label="Per-client coverage" rows={view.clients} />
      <div
        className={tooling.pair}
        role="group"
        aria-label="New events and carryover"
      >
        <ToolingPanel panel={view.changes} unavailable={unavailable} />
        <ToolingPanel
          panel={view.carryover}
          tone="muted"
          unavailable={unavailable}
        />
      </div>
      <div className={styles.draftRow}>
        <ToolingPanel panel={view.draft} unavailable={unavailable} />
        <div className={styles.stack}>
          <ActionRow
            label="Change report actions"
            actions={view.draftActions}
            unavailable={unavailable}
          />
        </div>
      </div>
    </ToolingPage>
  );
}
