"use client";
import { FieldTable } from "../../ui/FieldTable";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import type { ArtifactFlowView } from "./types";

/** Overlay · File <artifact>: the exact filing action reviewed as one immutable set of fields. */
export function FileSheet({
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
  return (
    <MeriDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={`File ${flow.name}`}
      description="Filing is a governed action. Confirm this destination and exact version before it is saved."
      width="compact"
    >
      <FieldTable
        caption={`Exact filing action for ${flow.fileName}`}
        fieldLabel="Exact action field"
        rows={flow.filing}
        shares={[165, 347]}
      />
      <div className={ui.row}>
        <button type="button" className={ui.outline} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          Approve and file
        </button>
      </div>
    </MeriDialog>
  );
}
