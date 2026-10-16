"use client";
import { MeriDialog } from "../../ui/MeriDialog";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import { verificationByKind } from "./artifact-kinds";
import { PipelineSteps } from "./PipelineSteps";
import type { ArtifactFlowView } from "./types";
import styles from "./files.module.css";

/** Overlay · Revising <artifact>: a recorded running revision and the checks it must pass. */
export function RevisionProgressSheet({
  flow,
  open,
  onClose,
}: {
  flow: ArtifactFlowView;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <MeriDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={`Revising ${flow.name}`}
      description="The previous version remains available while this output is checked."
      width="compact"
    >
      <span className={styles.pillSlot}>
        <StatusPill>Running</StatusPill>
      </span>
      <p className={styles.lede}>
        {`Creating version ${flow.version + 1} from verified version ${flow.version}.`}
      </p>
      <PipelineSteps
        label="Revision checks"
        steps={[
          {
            id: "verification",
            title: "Verification",
            detail: verificationByKind[flow.kind],
          },
        ]}
      />
      <div className={ui.row}>
        <button type="button" className={ui.outline} onClick={onClose}>
          Open previous version
        </button>
      </div>
    </MeriDialog>
  );
}
