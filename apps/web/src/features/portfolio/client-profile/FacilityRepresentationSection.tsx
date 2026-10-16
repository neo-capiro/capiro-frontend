import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { AddGovernmentTargetButton } from "@/features/portfolio/relationships/public";
import type { FacilityRepresentation as Representation } from "./facility-map-contracts";
import { FacilityRepresentation } from "./FacilityRepresentation";
import { FacilityCommittees } from "./FacilityCommittees";
import profile from "./facility-profile.module.css";

export function FacilityRepresentationSection({
  id,
  clientId,
  delegation,
  enabled,
  hasCurrentSession,
  pending,
  error,
  success,
  onRetry,
}: {
  id: string;
  clientId: string;
  delegation: Representation | undefined;
  enabled: boolean;
  hasCurrentSession: boolean;
  pending: boolean;
  error: Error | null;
  success: boolean;
  onRetry: () => void;
}) {
  const members =
    delegation && !delegation.unresolved
      ? [delegation.federal.house, ...delegation.federal.senate]
          .filter((member) => member !== null)
          .filter(
            (member, index, all) =>
              all.findIndex(
                (row) =>
                  row.bioguideId.toUpperCase() ===
                  member.bioguideId.toUpperCase(),
              ) === index,
          )
          .slice(0, 3)
      : [];
  return (
    <section
      id={id}
      tabIndex={-1}
      className={profile.card}
      aria-label="Elected representation"
    >
      <h3>Representation &amp; committees</h3>
      {!hasCurrentSession && (
        <p className="muted">
          A current session is required to load representation.
        </p>
      )}
      <QueryState
        pending={hasCurrentSession && pending}
        error={error}
        retry={onRetry}
      />
      {!error && success && <FacilityRepresentation value={delegation} />}
      {delegation && !delegation.unresolved && delegation.federal.house && (
        <AddGovernmentTargetButton
          clientId={clientId}
          memberId={delegation.federal.house.bioguideId}
          name={delegation.federal.house.fullName}
          sourceDirectory="congress"
        />
      )}
      {members.map((member) => (
        <FacilityCommittees
          key={member.bioguideId}
          clientId={clientId}
          member={member}
          enabled={enabled}
        />
      ))}
    </section>
  );
}
