import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { ScopeTags } from "./ScopeTags";
import { ToolingPanel, type ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type RelationshipHistoryView = {
  description: string;
  scope: readonly string[];
  events: readonly ToolingPanelView[];
  thread: ToolingPanelView;
  distinct: { title: string; detail: string };
  actions: readonly ActionSpec[];
};

/** 12.10 Relationship & mail history: dated evidence beside the exact permitted thread. */
export function RelationshipHistoryScreen({
  view,
  backHref,
  unavailable,
}: {
  view: RelationshipHistoryView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Relationship & mail history"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <ScopeTags label="Relationship context" tags={view.scope} />
      <div className={tooling.pair}>
        <section
          className={styles.section}
          aria-labelledby="relationship-evidence"
        >
          <h2 id="relationship-evidence" className={styles.titleS}>
            History supported by evidence
          </h2>
          {view.events.map((event) => (
            <ToolingPanel
              key={event.title}
              panel={event}
              body="large"
              unavailable={unavailable}
            />
          ))}
        </section>
        <ToolingPanel panel={view.thread} unavailable={unavailable} />
      </div>
      <Notice title={view.distinct.title}>{view.distinct.detail}</Notice>
      <ActionRow
        label="Relationship evidence actions"
        actions={view.actions}
        unavailable={unavailable}
      />
    </ToolingPage>
  );
}
