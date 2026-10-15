import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import { CommitmentRecord, type CommitmentView } from "./CommitmentRecord";
import { StatTiles, type StatTile } from "./StatTiles";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import tooling from "./tooling.module.css";

export type CommitmentsView = {
  scope: string;
  summary: readonly StatTile[];
  coverage: { title: string; detail: string };
  commitments: readonly CommitmentView[];
  excluded: string;
  actions: readonly ActionSpec[];
};

/** 12.02 Commitments & Deliverables: evidence-backed promises, delivery and missing tracked work. */
export function CommitmentsScreen({
  view,
  backHref,
  unavailable,
}: {
  view: CommitmentsView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Commitments & Deliverables"
      description={view.scope}
      backHref={backHref}
      unavailable={unavailable}
    >
      <StatTiles label="Commitment summary" tiles={view.summary} />
      <Notice title={view.coverage.title}>{view.coverage.detail}</Notice>
      <ul className={tooling.coverage} aria-label="Evidence-backed promises">
        {view.commitments.map((record) => (
          <CommitmentRecord
            key={record.promise}
            record={record}
            unavailable={unavailable}
          />
        ))}
      </ul>
      <p className={tooling.caption}>{view.excluded}</p>
      <ActionRow
        label="Commitment report actions"
        actions={view.actions}
        unavailable={unavailable}
      />
    </ToolingPage>
  );
}
