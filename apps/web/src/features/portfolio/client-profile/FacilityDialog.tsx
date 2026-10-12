"use client";
import { useState } from "react";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { Facility } from "./contracts";
import { facilityFormBody } from "./facility-map-model";
import {
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "./profile-access";
import { useFacilityWriter } from "./useFacilityWriter";
import { FacilityFields } from "./FacilityFields";
import { FacilityWriteStatus } from "./FacilityWriteStatus";

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
function FacilityEditor({
  clientId,
  actor,
  facility,
  onClose,
  onRestart,
}: {
  clientId: string;
  actor: ProfileActor | undefined;
  facility?: Facility;
  onClose: () => void;
  onRestart: () => void;
}) {
  const [initial] = useState(facility);
  const [validation, setValidation] = useState("");
  const writer = useFacilityWriter(
    clientId,
    actor,
    initial,
    onClose,
    onRestart,
  );
  const pending = writer.attempt?.status === "pending";
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!writer.canWrite) return;
    try {
      const body = facilityFormBody(
        Object.fromEntries(new FormData(event.currentTarget)),
        initial,
      );
      setValidation("");
      void writer.save({ kind: "save", body });
    } catch (cause) {
      setValidation(
        cause instanceof Error ? cause.message : "Review the facility details.",
      );
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      {!actor && (
        <p role="status">
          A current member session is required to save this facility.
        </p>
      )}
      <fieldset
        className="stack"
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        disabled={
          !actor || pending || !writer.query.source || Boolean(writer.attempt)
        }
      >
        <legend className="srOnly">Facility details</legend>
        <FacilityFields facility={initial} />
      </fieldset>
      {validation && (
        <p className="danger" role="alert">
          {validation}
        </p>
      )}
      <FacilityWriteStatus writer={writer} />
      <div className="formActions">
        <button type="button" className="button" onClick={onClose}>
          Cancel
        </button>
        <button className="button primary" disabled={!writer.canWrite}>
          {pending ? "Saving…" : facility ? "Save changes" : "Add facility"}
        </button>
      </div>
    </form>
  );
}
