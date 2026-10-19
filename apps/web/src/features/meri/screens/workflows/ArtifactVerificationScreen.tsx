import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import {
  ArtifactVerificationCard,
  type ArtifactVerificationView,
} from "./ArtifactVerificationCard";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import tooling from "./tooling.module.css";

export type ArtifactVerificationScreenView = {
  cards: readonly ArtifactVerificationView[];
  actions: readonly ActionSpec[];
  note: string;
};

/** 12.15 Artifact verification: format-specific gates that keep the last verified version. */
export function ArtifactVerificationScreen({
  view,
  backHref,
  unavailable,
}: {
  view: ArtifactVerificationScreenView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Artifact verification"
      description="Illustrative states · Exact selected versions · Workflow-specific checks"
      backHref={backHref}
      unavailable={unavailable}
    >
      <Notice title="Keep the last verified output available">
        An incomplete or failed check does not replace the published version.
        Download and filing stay blocked for the selected unverified version.
        Review checks, retry a qualified operation or ask Meri to create a new
        revision.
      </Notice>
      <div className={tooling.pair}>
        {view.cards.map((card) => (
          <ArtifactVerificationCard
            key={card.format}
            card={card}
            unavailable={unavailable}
          />
        ))}
      </div>
      <ActionRow
        label="Preserved version actions"
        actions={view.actions}
        unavailable={unavailable}
      />
      <p className={tooling.caption}>{view.note}</p>
    </ToolingPage>
  );
}
