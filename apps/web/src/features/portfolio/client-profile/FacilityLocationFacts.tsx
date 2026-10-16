import type { Facility } from "./contracts";
import type { FacilityRepresentation } from "./facility-map-contracts";
import { facilityAddress, facilityDistrict } from "./facility-map-model";
import { FacilityGeocoding } from "./FacilityGeocoding";
import profile from "./facility-profile.module.css";
import styles from "./facility-map.module.css";

export function FacilityLocationFacts({
  id,
  clientId,
  facility,
  delegation,
  available,
}: {
  id: string;
  clientId: string;
  facility: Facility;
  delegation: FacilityRepresentation | undefined;
  available: boolean;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      className={profile.card}
      aria-label="Location and geography"
    >
      <h3>Location &amp; geography</h3>
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
              : "-"}
          </strong>
          <small>MATCHED SENATORS</small>
        </div>
      </div>
      {facility.notes && <p className={styles.notes}>{facility.notes}</p>}
      <dl className={profile.facts}>
        <div>
          <dt>Address</dt>
          <dd>{facilityAddress(facility)}</dd>
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
    </section>
  );
}
