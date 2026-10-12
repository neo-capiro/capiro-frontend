"use client";
import { useState } from "react";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { Facility } from "./contracts";
import {
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "./profile-access";
import { useFacilityWriter } from "./useFacilityWriter";
import { FacilityWriteStatus } from "./FacilityWriteStatus";

export function FacilityRemoveDialog({
  clientId,
  clientName,
  facility,
  open,
  onOpenChange,
  onRemoved,
}: {
  clientId: string;
  clientName: string;
  facility: Facility;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}) {
  useIdentity();
  const actor = useProfileActor();
  const [revision, setRevision] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove facility"
      description={`Remove ${facility.name} from ${clientName}? Its location will no longer contribute to this client's footprint.`}
    >
      {open && (
        <FacilityRemovalEditor
          key={`${clientId}:${facility.id}:${profileActorKey(actor)}:${revision}`}
          clientId={clientId}
          actor={actor}
          facility={facility}
          onRemoved={onRemoved}
          onCancel={() => onOpenChange(false)}
          onRestart={() => setRevision((value) => value + 1)}
        />
      )}
    </Dialog>
  );
}
function FacilityRemovalEditor({
  clientId,
  actor,
  facility,
  onRemoved,
  onCancel,
  onRestart,
}: {
  clientId: string;
  actor: ProfileActor | undefined;
  facility: Facility;
  onRemoved: () => void;
  onCancel: () => void;
  onRestart: () => void;
}) {
  const [initial] = useState(facility);
  const writer = useFacilityWriter(
    clientId,
    actor,
    initial,
    onRemoved,
    onRestart,
  );
  return (
    <>
      <FacilityWriteStatus writer={writer} />
      <div className="formActions">
        <button className="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={!writer.canWrite}
          onClick={() => void writer.save({ kind: "remove" })}
        >
          {writer.attempt?.status === "pending"
            ? "Removing…"
            : "Remove facility"}
        </button>
      </div>
    </>
  );
}
