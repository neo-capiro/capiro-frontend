"use client";
import { FileText } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import { MeriDialog } from "../../ui/MeriDialog";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import { sentenceCase } from "./artifact-kinds";
import type { ArtifactFlowView } from "./types";
import styles from "./files.module.css";

/** Overlay · <Artifact> filed: the recorded filing of the exact version, saved once. */
export function FiledOutcomeSheet({
  flow,
  open,
  onClose,
  unavailable,
}: {
  flow: ArtifactFlowView;
  open: boolean;
  onClose: () => void;
  unavailable: string;
}) {
  const { filed } = flow.recorded;
  return (
    <MeriDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={`${sentenceCase(flow.name)} filed`}
      description={`${flow.fileName} · Immutable v${flow.version}`}
      width="default"
    >
      <span className={styles.pillSlot}>
        <StatusPill tone="success">Saved once</StatusPill>
      </span>
      <div className={styles.small}>
        <p>{filed.destination}</p>
        <p>Source restrictions preserved.</p>
        <p>{`Approved by ${filed.approvedBy} · Receipt recorded.`}</p>
      </div>
      <div className={styles.stackActions}>
        <button type="button" className={ui.primary} onClick={onClose}>
          <FileText aria-hidden /> Open artifact
        </button>
        {/* 04.07 is the meeting brief's receipt; this artifact's receipt has no frame. */}
        <LinkAction variant="outline" unavailable={unavailable}>
          View filing details
        </LinkAction>
      </div>
    </MeriDialog>
  );
}
