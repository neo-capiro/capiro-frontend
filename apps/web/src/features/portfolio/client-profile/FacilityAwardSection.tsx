"use client";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { ProfileEvidenceScope } from "./profile-evidence-contracts";
import { useFacilityNexus } from "./facility-map-queries";
import { ClientAwardFacts } from "./FederalActivity";
import { NexusSourceFreshness } from "./NexusSourceFreshness";
import styles from "./facility-profile.module.css";

export function FacilityAwardSection({
  scope,
  open,
  id,
}: {
  scope: ProfileEvidenceScope;
  open: boolean;
  id: string;
}) {
  const query = useFacilityNexus(scope.clientId, open);
  const data = query.enabled && !query.error ? query.data : undefined;
  const key = scope.district
    ? `${scope.district.state}-${scope.district.districtCode}`
    : null;
  const district = data?.districts.find((row) => row.districtKey === key);
  return (
    <section
      id={id}
      tabIndex={-1}
      className={styles.card}
      aria-label="Contracts and grants"
    >
      <h3>Contracts &amp; grants</h3>
      <p className="muted">
        Confirmed client-attributed awards in this district. District
        attribution does not prove this location received the award.
      </p>
      {!query.enabled && (
        <p className="muted">
          A current session is required to load award evidence.
        </p>
      )}
      <QueryState
        pending={query.enabled && query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {data && (
        <>
          <ClientAwardFacts value={district?.awarded} />
          {!key && (
            <p className="muted">
              No usable district is recorded for this location.
            </p>
          )}
          {key && !district && (
            <p className="muted">No client nexus row returned for {key}.</p>
          )}
          <p className="muted">
            Opportunities, ceilings and public district awards are separate from
            these obligation and outlay measures.
          </p>
          <NexusSourceFreshness value={data} />
        </>
      )}
    </section>
  );
}
