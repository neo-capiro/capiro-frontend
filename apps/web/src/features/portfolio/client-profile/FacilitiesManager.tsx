"use client";
import { useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { Facility } from "./contracts";
import { useFacilities } from "./queries";
import { profileActorKey, useProfileActor } from "./profile-access";
import { facilityAddress, facilityDistrict } from "./facility-map-model";
import { FacilityEditor } from "./FacilityEditor";
import { FacilityGeocoding } from "./FacilityGeocoding";
import { FacilityRemoveDialog } from "./FacilityRemoveDialog";
import styles from "./facilities-manager.module.css";

type ManagerProps = {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FacilitiesManager(props: ManagerProps) {
  const actor = useProfileActor();
  return props.open ? (
    <CurrentFacilitiesManager
      key={`${props.clientId}:${profileActorKey(actor)}`}
      {...props}
    />
  ) : null;
}

function CurrentFacilitiesManager({
  clientId,
  clientName,
  open,
  onOpenChange,
}: ManagerProps) {
  const actor = useProfileActor();
  const query = useFacilities(clientId);
  const [editing, setEditing] = useState<Facility | "new" | null>("new");
  const [removing, setRemoving] = useState<string>();
  const [revision, setRevision] = useState(0);
  const facilities = query.data ?? [];
  const selected = editing && editing !== "new" ? editing : undefined;
  const removal = facilities.find((facility) => facility.id === removing);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Facilities: ${clientName}`}
      className={styles.manager}
    >
      <div className={styles.body}>
        <p className={styles.description}>
          Facilities give this client a congressional footprint. Each one’s
          state and district drive District Nexus, representative matching, and
          district-based recommendations.
        </p>
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        <ul className={styles.facilities} aria-label="Saved facilities">
          {facilities.map((facility) => (
            <li key={facility.id} className={styles.facility}>
              <div className={styles.facilityHeading}>
                <h3>{facility.name}</h3>
                <div className={styles.actions}>
                  <button
                    className="button"
                    disabled={!query.source}
                    onClick={() => setEditing(facility)}
                  >
                    Edit
                  </button>
                  <button
                    className="button ghost danger"
                    disabled={!query.source}
                    onClick={() => setRemoving(facility.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <p>
                {[
                  facilityAddress(facility),
                  facilityDistrict(facility),
                  facility.employeeCount === null
                    ? undefined
                    : `${facility.employeeCount.toLocaleString()} employees`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <FacilityGeocoding
                clientId={clientId}
                facility={facility}
                disabled={!query.source}
                compact
              />
            </li>
          ))}
        </ul>
        {query.data && !facilities.length && (
          <p className="muted">No saved facilities yet.</p>
        )}
        {editing !== null && (
          <FacilityEditor
            key={`${selected?.id ?? "new"}:${revision}`}
            clientId={clientId}
            actor={actor}
            facility={selected}
            inline
            onClose={() => setEditing(null)}
            onRestart={() => setRevision((value) => value + 1)}
          />
        )}
      </div>
      <footer className={styles.footer}>
        <button
          className="button primary"
          disabled={!query.source}
          onClick={() => {
            setEditing("new");
            setRevision((value) => value + 1);
          }}
        >
          Add facility
        </button>
        <button className="button" onClick={() => onOpenChange(false)}>
          Done
        </button>
      </footer>
      {removal && (
        <FacilityRemoveDialog
          clientId={clientId}
          clientName={clientName}
          facility={removal}
          open
          onOpenChange={(value) => {
            if (!value) setRemoving(undefined);
          }}
          onRemoved={() => {
            setRemoving(undefined);
            if (selected?.id === removal.id) setEditing(null);
          }}
        />
      )}
    </Dialog>
  );
}
