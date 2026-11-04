import type {
  CapabilitySupport,
  OfficeRelationship,
} from "@/features/portfolio/capabilities/public";
import type { GovernmentTarget } from "./target-contracts";

export function relationshipGaps(
  relationships: OfficeRelationship[],
  capabilities: { id: string; name: string }[],
  supports: CapabilitySupport[],
) {
  return {
    officesWithoutCapabilities: relationships.filter(
      (relationship) =>
        !supports.some((support) => support.targetId === relationship.id),
    ),
    capabilitiesWithoutOffices: capabilities.filter(
      (capability) =>
        !supports.some(
          (support) =>
            support.capabilityId === capability.id &&
            relationships.some(
              (relationship) => relationship.id === support.targetId,
            ),
        ),
    ),
  };
}
export function filterOfficeRelationships(
  relationships: OfficeRelationship[],
  targets: GovernmentTarget[],
  supports: CapabilitySupport[],
  filters: {
    capability: string;
    status: string;
    geography: string;
    owner: string;
  },
) {
  return relationships.filter((relationship) => {
    const target = targets.find((target) => target.id === relationship.id);
    return (
      (!filters.capability ||
        supports.some(
          (support) =>
            support.targetId === relationship.id &&
            support.capabilityId === filters.capability,
        )) &&
      (!filters.status || relationship.relationshipStatus === filters.status) &&
      (!filters.owner || relationship.ownerUserId === filters.owner) &&
      (!filters.geography ||
        [
          target?.state,
          target?.chamber,
          target?.memberName,
          ...(target?.representedFacilities?.map((facility) => facility.name) ??
            []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(filters.geography.toLowerCase()))
    );
  });
}
