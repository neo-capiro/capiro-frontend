"use client";
import { useId, useRef, useState } from "react";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import type { Facility } from "./contracts";
import { FacilityDialog } from "./FacilityDialog";
import { FacilityLocationFacts } from "./FacilityLocationFacts";
import { FacilityRepresentationSection } from "./FacilityRepresentationSection";
import { facilityAddress, facilityDistrict } from "./facility-map-model";
import { useFacilityRepresentation } from "./facility-map-queries";
import { FacilityRemoveDialog } from "./FacilityRemoveDialog";
import { FacilityEconomicSections } from "./FacilityEconomicSections";
import { FacilityStrategySections } from "./FacilityStrategySections";
import { FacilityAwardSection } from "./FacilityAwardSection";
import {
  normalizeProfileDistrict,
  type ProfileEvidenceScope,
} from "./profile-evidence-contracts";
import { useProfileActor } from "./profile-access";
import profile from "./facility-profile.module.css";

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
  const bodyRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const actor = useProfileActor();
  const current = facility.clientId === clientId;
  const enabled = open && current;
  const representation = useFacilityRepresentation(clientId, enabled);
  const delegation =
    !representation.error && representation.isSuccess
      ? representation.data?.find((row) => row.facility.id === facility.id)
          ?.representation
      : undefined;
  const scope: ProfileEvidenceScope = {
    clientId,
    facilityId: facility.id,
    district: normalizeProfileDistrict({
      state: facility.state,
      districtCode: facility.congressionalDistrict,
    }),
  };
  const ids = Object.fromEntries(
    [
      "location",
      "economic",
      "unemployment",
      "workforce",
      "representation",
      "awards",
      "strategic",
      "priorities",
      "engagement",
      "changes",
    ].map((name) => [name, `${id}-${name}`]),
  ) as Record<
    | "location"
    | "economic"
    | "unemployment"
    | "workforce"
    | "representation"
    | "awards"
    | "strategic"
    | "priorities"
    | "engagement"
    | "changes",
    string
  >;
  const navigate = (target: string) => {
    const section = document.getElementById(target);
    const body = bodyRef.current;
    if (!section || !body?.contains(section)) return;
    body.scrollTo({
      top:
        body.scrollTop +
        section.getBoundingClientRect().top -
        body.getBoundingClientRect().top -
        4,
      behavior: "auto",
    });
    section.focus({ preventScroll: true });
  };
  return (
    <>
      <Dialog
        open={open}
        className={profile.dialog}
        overlayClassName={profile.overlay}
        onOpenChange={onOpenChange}
        eyebrow={current ? `${clientName} / District nexus` : "District nexus"}
        textClose
        headerActions={
          <button
            className="button"
            disabled={!available || !current}
            onClick={() => setEditing(true)}
          >
            Edit location
          </button>
        }
        title={
          current
            ? `${facility.name}${facilityDistrict(facility) ? ` · ${facilityDistrict(facility)}` : ""}`
            : "Location unavailable"
        }
        description={
          current
            ? facilityAddress(facility)
            : "The saved location does not match the current client."
        }
      >
        {!current ? (
          <p role="alert">
            This location is unavailable for the current client.
          </p>
        ) : (
          <div className={profile.layout}>
            <nav
              className={profile.navigation}
              aria-label="Location profile sections"
            >
              <span className={profile.navigationLabel}>On this page</span>
              {(
                [
                  ["Location", ids.location],
                  ["Footprint", ids.economic],
                  ["Workforce", ids.unemployment],
                  ["Federal activity", ids.representation],
                  ["Strategy & engagement", ids.strategic],
                  ["Evidence", ids.changes],
                ] as const
              ).map(([label, target]) => (
                <button
                  key={target}
                  className="button ghost"
                  onClick={() => navigate(target)}
                >
                  {label}
                </button>
              ))}
              <div className={profile.navigationNote}>
                <span>10 areas of context</span>
                <span>Client evidence and public data remain distinct.</span>
              </div>
            </nav>
            <div ref={bodyRef} className={profile.body}>
              <FacilityLocationFacts
                id={ids.location}
                clientId={clientId}
                facility={facility}
                delegation={delegation}
                available={available}
              />
              <FacilityEconomicSections
                key={`economic:${facility.id}:${scope.district?.state}:${scope.district?.districtCode}`}
                scope={scope}
                open={enabled}
                ids={ids}
              />
              <FacilityRepresentationSection
                id={ids.representation}
                clientId={clientId}
                delegation={delegation}
                enabled={enabled}
                hasCurrentSession={Boolean(actor)}
                pending={representation.isPending}
                error={representation.error}
                success={representation.isSuccess}
                onRetry={() => void representation.refetch()}
              />
              <FacilityAwardSection
                scope={scope}
                open={enabled}
                id={ids.awards}
              />
              <FacilityStrategySections
                key={`strategy:${facility.id}:${scope.district?.state}:${scope.district?.districtCode}`}
                scope={scope}
                open={enabled}
                ids={ids}
              />
            </div>
          </div>
        )}
        <footer className={profile.footer}>
          <div className={profile.footerContext}>
            <small>
              Location evidence retains its source and period. Economic impact
              and award attribution require supporting records.
            </small>
            <button
              className="button ghost danger"
              disabled={!available || !current}
              onClick={() => setRemoving(true)}
            >
              Remove
            </button>
          </div>
          <button className="button" onClick={() => onOpenChange(false)}>
            Done
          </button>
        </footer>
      </Dialog>
      {current && (
        <FacilityDialog
          key={`${facility.id}-${editing}`}
          clientId={clientId}
          clientName={clientName}
          facility={facility}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
      {current && (
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
      )}
    </>
  );
}
