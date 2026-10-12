"use client";
import { useState } from "react";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { Facility } from "./contracts";
import { profileActorKey, useProfileActor } from "./profile-access";
import { FacilityEditor } from "./FacilityEditor";

export function FacilityDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
  facility,
}: {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility?: Facility;
}) {
  useIdentity();
  const actor = useProfileActor();
  const [revision, setRevision] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={facility ? "Edit facility" : "Add facility"}
      description={`Location for ${clientName}. Complete the address to request automatic geocoding.`}
    >
      {open && (
        <FacilityEditor
          key={`${clientId}:${facility?.id ?? "create"}:${profileActorKey(actor)}:${revision}`}
          clientId={clientId}
          actor={actor}
          facility={facility}
          onClose={() => onOpenChange(false)}
          onRestart={() => setRevision((value) => value + 1)}
        />
      )}
    </Dialog>
  );
}
