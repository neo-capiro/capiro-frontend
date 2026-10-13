"use client";
import type { Facility } from "./contracts";
import { useFacilityAction } from "./facility-map-mutations";
import {
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "./profile-access";
import { FacilityActionStatus } from "./FacilityActionStatus";
import styles from "./facility-map.module.css";

export function FacilityGeocoding({
  clientId,
  facility,
  disabled = false,
}: {
  clientId: string;
  facility: Facility;
  disabled?: boolean;
}) {
  const actor = useProfileActor();
  return (
    <CurrentFacilityGeocoding
      key={`${clientId}:${facility.id}:${profileActorKey(actor)}`}
      clientId={clientId}
      facility={facility}
      disabled={disabled}
      actor={actor}
    />
  );
}
function CurrentFacilityGeocoding({
  clientId,
  facility,
  disabled,
  actor,
}: {
  clientId: string;
  facility: Facility;
  disabled: boolean;
  actor: ProfileActor | undefined;
}) {
  const mutation = useFacilityAction(clientId, facility, actor, !disabled);
  const hasAddress = Boolean(
    facility.addressLine?.trim() &&
    facility.city?.trim() &&
    facility.state?.trim(),
  );
  return (
    <section className="stack" aria-label="Address resolution">
      <h3>Address resolution</h3>
      <p className="muted">
        Geocoder:{" "}
        {facility.geocodeStatus?.replaceAll("_", " ") ?? "Not requested"}
        {facility.districtSource
          ? ` · District source: ${facility.districtSource === "geocoded" ? "Geocoded" : facility.districtSource}`
          : ""}
      </p>
      {facility.geocodeMatchedAddress && (
        <p>{facility.geocodeMatchedAddress}</p>
      )}
      {facility.congressionalDistrictCongress != null && (
        <p className="muted">
          District boundary source: {facility.congressionalDistrictCongress}th
          Congress.
        </p>
      )}
      {facility.geocodeLastError && (
        <p className="danger">{facility.geocodeLastError}</p>
      )}
      {facility.geocodeCandidates?.length ? (
        <fieldset className={styles.candidates}>
          <legend>Choose a Census address</legend>
          {!facility.geocodeCandidateRevision && (
            <p className="muted">
              Reviewed address selection is unavailable from this service.
            </p>
          )}
          {facility.geocodeCandidates.map((candidate, candidateIndex) => (
            <div className={styles.candidate} key={candidateIndex}>
              <span>
                {candidate.matchedAddress ?? "Address unavailable"}
                {candidate.congressionalDistrict
                  ? ` · District ${candidate.congressionalDistrict}`
                  : ""}
              </span>
              <button
                className="button"
                disabled={
                  !mutation.canAct ||
                  !candidate.matchedAddress ||
                  !facility.geocodeCandidateRevision
                }
                onClick={() => {
                  if (!facility.geocodeCandidateRevision) return;
                  void mutation.run({
                    kind: "geocode-candidate",
                    facilityId: facility.id,
                    candidateIndex,
                    expectedRevision: facility.geocodeCandidateRevision,
                  });
                }}
              >
                Use this address
              </button>
            </div>
          ))}
        </fieldset>
      ) : null}
      <div className="row">
        <button
          className="button"
          disabled={!mutation.canAct || !hasAddress}
          onClick={() =>
            void mutation.run({
              kind: "resolve-district",
              facilityId: facility.id,
            })
          }
        >
          {mutation.isPending && mutation.kind === "resolve-district"
            ? "Resolving…"
            : "Resolve district"}
        </button>
        <button
          className="button ghost"
          disabled={!mutation.canAct || !hasAddress}
          onClick={() =>
            void mutation.run({ kind: "geocode", facilityId: facility.id })
          }
        >
          Retry geocoding
        </button>
      </div>
      {!hasAddress && (
        <p className="muted">
          Enter a street address, city and state before geocoding.
        </p>
      )}
      <FacilityActionStatus
        error={mutation.error}
        unknown={mutation.unknown}
        reviewed={mutation.reviewed}
        reviewing={mutation.reviewing}
        message={mutation.message}
        onReview={() => void mutation.review()}
      />
    </section>
  );
}
