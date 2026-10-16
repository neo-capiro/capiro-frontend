import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { MetadataList } from "./MetadataList";
import { PanelPair } from "./PanelPair";
import type { ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import { WorkflowField } from "./WorkflowField";
import type { ActionSpec, MetadataRow } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type FundingMarketView = {
  subject: string;
  opportunities: readonly ToolingPanelView[];
  rails: readonly MetadataRow[];
  railsNote: string;
  requirements: readonly string[];
  partial: { title: string; detail: string };
  actions: readonly ActionSpec[];
};

/** 12.07 Funding & federal market: grants, solicitations, forecasts and awards on separate rails. */
export function FundingMarketScreen({
  view,
  backHref,
  unavailable,
}: {
  view: FundingMarketView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Funding & federal market"
      description="Opportunity match · Held source facts and separate market rails"
      backHref={backHref}
      unavailable={unavailable}
    >
      <WorkflowField
        field={{ label: "Subject & scope", value: view.subject, helper: "" }}
      />
      <PanelPair
        label="Grant and solicitation rails"
        panels={view.opportunities}
        unavailable={unavailable}
      />
      <section
        className={tooling.box}
        data-tone="muted"
        aria-labelledby="market-rails"
      >
        <h2 id="market-rails" className={tooling.boxTitle}>
          Other market rails
        </h2>
        <MetadataList
          label="Other market rails"
          rows={view.rails}
          labelWidth={180}
        />
        <p className={tooling.caption}>{view.railsNote}</p>
      </section>
      <section
        className={styles.section}
        aria-labelledby="requirements-context"
      >
        <h2 id="requirements-context" className={tooling.boxTitle}>
          Document requirements &amp; government context
        </h2>
        {view.requirements.map((line) => (
          <p key={line} className={tooling.caption}>
            {line}
          </p>
        ))}
      </section>
      <Notice title={view.partial.title}>{view.partial.detail}</Notice>
      <ActionRow
        label="Funding review actions"
        actions={view.actions}
        unavailable={unavailable}
      />
    </ToolingPage>
  );
}
