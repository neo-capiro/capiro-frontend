import { Notice } from "../../ui/Notice";
import { ActionRow } from "./ActionRow";
import {
  ArtifactFormatCard,
  type ArtifactFormatView,
} from "./ArtifactFormatCard";
import { ToolingPage } from "./ToolingPage";
import type { ActionSpec } from "./types";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type ArtifactFormatsView = {
  formats: readonly ArtifactFormatView[];
  actions: readonly ActionSpec[];
  note: string;
};

/** 12.05 Artifact formats: native outputs with read-only previews and exact versions. */
export function ArtifactFormatsScreen({
  view,
  backHref,
  unavailable,
}: {
  view: ArtifactFormatsView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  return (
    <ToolingPage
      title="Create an artifact"
      description="Native files, exact versions and the evidence used to produce them."
      backHref={backHref}
      unavailable={unavailable}
    >
      <Notice title="Office previews are read-only">
        Ask Meri to revise the selected version. Each revision creates a new
        version and preserves the original. Download and filing become available
        after saving and verification.
      </Notice>
      <ul className={styles.formatGrid} aria-label="Artifact formats">
        {view.formats.map((card) => (
          <li key={card.format}>
            <ArtifactFormatCard card={card} unavailable={unavailable} />
          </li>
        ))}
      </ul>
      <ActionRow
        label="Artifact template actions"
        actions={view.actions}
        unavailable={unavailable}
      />
      <p className={tooling.caption}>{view.note}</p>
    </ToolingPage>
  );
}
