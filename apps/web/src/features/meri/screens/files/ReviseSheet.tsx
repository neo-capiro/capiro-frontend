"use client";
import { useState } from "react";
import { Sparkle } from "lucide-react";
import { FormField } from "../../ui/FormField";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import type { ArtifactFlowView } from "./types";

/** Overlay · Revise <artifact>: the requested change is a local draft; creating the version needs the trusted service. */
export function ReviseSheet({
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
  const [request, setRequest] = useState(flow.request);
  return (
    <MeriDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={`Revise ${flow.name}`}
      description={`Creates version ${flow.version + 1}. Version ${flow.version} and its contributing sources remain available.`}
      width="compact"
    >
      <FormField
        label="Current artifact"
        value={`${flow.fileName} · v${flow.version} · Verified`}
      />
      <FormField
        label="Requested change"
        value={request}
        onChange={setRequest}
        multiline
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
          <Sparkle aria-hidden /> Create new version
        </button>
      </div>
    </MeriDialog>
  );
}
