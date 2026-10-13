"use client";
import { useState } from "react";
import type { Facility } from "./contracts";
import type { ProfileActor } from "./profile-access";
import { facilityFormBody } from "./facility-map-model";
import { useFacilityWriter } from "./useFacilityWriter";
import { FacilityFields } from "./FacilityFields";
import { FacilityWriteStatus } from "./FacilityWriteStatus";
import styles from "./facilities-manager.module.css";

export function FacilityEditor({
  clientId,
  actor,
  facility,
  onClose,
  onRestart,
  inline = false,
}: {
  clientId: string;
  actor: ProfileActor | undefined;
  facility?: Facility;
  onClose: () => void;
  onRestart: () => void;
  inline?: boolean;
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
    <form className={`stack ${inline ? styles.editor : ""}`} onSubmit={submit}>
      {inline && (
        <h3 className="eyebrow">
          {facility ? "Edit facility" : "Add facility"}
        </h3>
      )}
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
          {pending
            ? "Saving…"
            : inline
              ? "Save facility"
              : facility
                ? "Save changes"
                : "Add facility"}
        </button>
      </div>
    </form>
  );
}
