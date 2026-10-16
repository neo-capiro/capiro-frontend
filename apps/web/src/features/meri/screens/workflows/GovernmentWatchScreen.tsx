import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { PanelPair } from "./PanelPair";
import { ScopeTags } from "./ScopeTags";
import type { ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import tooling from "./tooling.module.css";

export type GovernmentWatchView = {
  scope: readonly string[];
  results: readonly ToolingPanelView[];
  actions: readonly ActionSpec[];
};

/** 12.13 Government watch: bill, hearing, representation and docket evidence kept distinct. */
export function GovernmentWatchScreen({
  view,
  backHref,
  unavailable,
}: {
  view: GovernmentWatchView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Government watch"
      description="Bill Watch · Hearing Watch · Representation Lookup · Regulatory Docket Brief"
      backHref={backHref}
      unavailable={unavailable}
    >
      <ScopeTags label="Government watch scope" tags={view.scope} />
      <Notice title="Source-backed examples">
        Demonstration records show the evidence each workflow must retain. These
        are not current political claims. Each starter requires its own source
        and runtime qualification.
      </Notice>
      <PanelPair
        label="Government watch results"
        panels={view.results}
        body="large"
        unavailable={unavailable}
      />
      <ActionRow
        label="Government watch actions"
        actions={view.actions}
        unavailable={unavailable}
      />
      <p className={tooling.caption}>
        A missing vote is not a failed vote. A referral is not passage or
        enactment. Partial source coverage cannot establish absence.
      </p>
    </ToolingPage>
  );
}
