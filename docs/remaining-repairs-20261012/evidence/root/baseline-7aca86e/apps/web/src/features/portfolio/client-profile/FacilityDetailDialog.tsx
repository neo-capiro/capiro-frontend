"use client";
import { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { AddGovernmentTargetButton } from "@/features/portfolio/relationships/public";
import type { Facility } from "./contracts";
import { FacilityDialog } from "./FacilityDialog";
import { FacilityGeocoding } from "./FacilityGeocoding";
import { FacilityRepresentation } from "./FacilityRepresentation";
import { facilityAddress, facilityDistrict } from "./facility-map-model";
import { useFacilityRepresentation } from "./facility-map-queries";
import { FacilityRemoveDialog } from "./FacilityRemoveDialog";
import styles from "./facility-map.module.css";

export function FacilityDetailDialog({
  clientId,
  clientName,
  facility,
  open,
  onOpenChange,
  available = true,
}: {
  clientId: string;
  clientName: string;
  facility: Facility;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  available?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const representation = useFacilityRepresentation(clientId, open);
  const delegation =
    !representation.error && representation.isSuccess
      ? representation.data?.find((row) => row.facility.id === facility.id)
          ?.representation
      : undefined;
  return (
    <>
      <Dialog
        open={open}
        className={styles.detail}
        onOpenChange={onOpenChange}
        title={`${facility.name}${facilityDistrict(facility) ? ` · ${facilityDistrict(facility)}` : ""}`}
        description={`Location for ${clientName}. ${facilityAddress(facility)}`}
      >
        <div className={styles.stats}>
          <div>
            <strong>
              {facility.employeeCount?.toLocaleString() ?? "Not reported"}
            </strong>
            <small>EMPLOYEES</small>
          </div>
          <div>
            <strong>{facilityDistrict(facility) ?? "Unresolved"}</strong>
            <small>HOUSE DISTRICT</small>
          </div>
          <div>
            <strong>
              {delegation && !delegation.unresolved
                ? delegation.federal.senate.length
                : "—"}
            </strong>
            <small>MATCHED SENATORS</small>
          </div>
        </div>
        {facility.notes && <p className={styles.notes}>{facility.notes}</p>}
        <section className="stack" aria-label="Elected representation">
          <h3>Delegation</h3>
          <QueryState
            pending={representation.isPending}
            error={representation.error}
            retry={() => void representation.refetch()}
          />
          {!representation.error && representation.isSuccess && (
            <FacilityRepresentation value={delegation} />
          )}
          {delegation && !delegation.unresolved && delegation.federal.house && (
            <AddGovernmentTargetButton
              clientId={clientId}
              memberId={delegation.federal.house.bioguideId}
              name={delegation.federal.house.fullName}
              sourceDirectory="congress"
            />
          )}
        </section>
        <FacilityGeocoding
          clientId={clientId}
          facility={facility}
          disabled={!available}
        />
        <div className="row between">
          <Link
            className="button"
            href={`/portfolio/${clientId}/relationships?kind=government`}
          >
            Open relationships
          </Link>
          <div className="row">
            <button
              className="button"
              disabled={!available}
              onClick={() => setEditing(true)}
            >
              Edit facility
            </button>
            <button
              className="button ghost danger"
              disabled={!available}
              onClick={() => setRemoving(true)}
            >
              Remove
            </button>
          </div>
        </div>
      </Dialog>
      <FacilityDialog
        key={`${facility.id}-${editing}`}
        clientId={clientId}
        clientName={clientName}
        facility={facility}
        open={editing}
        onOpenChange={setEditing}
      />
      <FacilityRemoveDialog
        clientId={clientId}
        clientName={clientName}
        facility={facility}
        open={removing}
        onOpenChange={setRemoving}
        onRemoved={() => {
          setRemoving(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
