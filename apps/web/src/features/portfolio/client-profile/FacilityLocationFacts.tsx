import Link from "next/link";
import type { Facility } from "./contracts";
import type { FacilityRepresentation } from "./facility-map-contracts";
import { facilityAddress, facilityDistrict } from "./facility-map-model";
import { FacilityGeocoding } from "./FacilityGeocoding";
import profile from "./facility-profile.module.css";

export function FacilityLocationFacts({
  id,
  clientId,
  clientName,
  facility,
  delegation,
  representationPending,
  available,
  onRemove,
}: {
  id: string;
  clientId: string;
  clientName: string;
  facility: Facility;
  delegation: FacilityRepresentation | undefined;
  representationPending: boolean;
  available: boolean;
  onRemove: () => void;
}) {
  const hasFullAddress = Boolean(
    facility.addressLine?.trim() &&
    facility.city?.trim() &&
    facility.state?.trim(),
  );
  const verifiedGeography =
    hasFullAddress &&
    facility.geocodeStatus === "matched" &&
    facility.districtSource === "geocoded";
  const stateLegislativeDistricts = [
    facility.stateHouseDistrict ? `House ${facility.stateHouseDistrict}` : null,
    facility.stateSenateDistrict
      ? `Senate ${facility.stateSenateDistrict}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const member =
    delegation && !delegation.unresolved ? delegation.federal.house : null;
  const senators =
    delegation && !delegation.unresolved
      ? delegation.federal.senate.map((senator) => senator.fullName).join(" · ")
      : "";
  const representationUnavailable = representationPending
    ? "Loading public roster…"
    : "Not available from the current public roster";
  return (
    <>
      <section
        id={id}
        tabIndex={-1}
        className={`${profile.card} ${profile.locationCard}`}
        aria-label="Location and geography"
      >
        <p className={profile.locationEyebrow}>Observed physical presence</p>
        <h3>Location</h3>
        <div className={profile.locationArea}>
          <h4>Locations and districts</h4>
          <p className={profile.locationExplanation}>
            The saved facility and its resolved geography. District assignments
            need supporting address evidence.
          </p>
          <dl className={`${profile.facts} ${profile.locationFacts}`}>
            <div>
              <dt>Facility</dt>
              <dd>
                {facility.name} · {clientName}
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                {facilityAddress(facility)}
                {!hasFullAddress && (
                  <small>Complete street address is not supplied.</small>
                )}
              </dd>
            </div>
            <div>
              <dt>House district</dt>
              <dd>
                {facilityDistrict(facility) ?? "Not supplied"}
                <small>
                  {verifiedGeography
                    ? "Resolved from the saved address; review source and boundary below."
                    : "Saved assignment; geography verification not supplied."}
                </small>
              </dd>
            </div>
            <div>
              <dt>State legislative districts</dt>
              <dd>
                {stateLegislativeDistricts || "Not supplied"}
                {!stateLegislativeDistricts && (
                  <small>
                    Address-based resolution and manual review are available.
                  </small>
                )}
              </dd>
            </div>
          </dl>
          {!verifiedGeography && (
            <div className={profile.locationWarning} role="note">
              <strong>Geography needs verification</strong>
              <span>
                Confirm the full facility address before relying on district
                assignments.
              </span>
            </div>
          )}
        </div>
        <div className={profile.locationArea}>
          <h4>Representation and committees</h4>
          <p className={profile.locationExplanation}>
            Representation follows verified facility geography; committee
            assignments come from public member records.
          </p>
          <dl className={`${profile.facts} ${profile.locationFacts}`}>
            <div>
              <dt>Representative</dt>
              <dd>
                {member?.fullName ?? representationUnavailable}
                <small>
                  {member
                    ? "Current public roster; review committee source below."
                    : "A verified district and current roster are required."}
                </small>
              </dd>
            </div>
            <div>
              <dt>Senators</dt>
              <dd>
                {senators || representationUnavailable}
                <small>
                  Public roster coverage and source freshness may vary.
                </small>
              </dd>
            </div>
          </dl>
          <Link
            className="button"
            href={`/portfolio/${encodeURIComponent(clientId)}/relationships?kind=government`}
          >
            Open relationships
          </Link>
        </div>
      </section>
      <section
        className={`${profile.card} ${profile.locationSourceDetails}`}
        aria-label="Location source and address resolution"
      >
        <h3>Location source and address resolution</h3>
        {facility.notes && <p>{facility.notes}</p>}
        <dl className={profile.facts}>
          <div>
            <dt>Saved employees</dt>
            <dd>
              {facility.employeeCount?.toLocaleString() ?? "Not reported"}
            </dd>
          </div>
          <div>
            <dt>Facility type</dt>
            <dd>Unavailable from the saved facility record.</dd>
          </div>
          <div>
            <dt>District source</dt>
            <dd>{facility.districtSource ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Boundary Congress</dt>
            <dd>
              {facility.districtSource === "user"
                ? "Unverified for a manually selected district"
                : (facility.congressionalDistrictCongress ?? "Unavailable")}
            </dd>
          </div>
        </dl>
        <p className="muted">
          District evidence below uses the saved district code. Source and
          boundary vintages may differ; the sections are not a synchronized
          snapshot.
        </p>
        <FacilityGeocoding
          clientId={clientId}
          facility={facility}
          disabled={!available}
        />
        <button
          className="button ghost danger"
          disabled={!available}
          onClick={onRemove}
        >
          Remove
        </button>
      </section>
    </>
  );
}
