"use client";
import {
  useProfileDistrictPriority,
  useProfileDistrictStrategic,
} from "./profile-evidence-queries";
import type { ProfileEvidenceScope } from "./profile-evidence-contracts";
import { FacilityStrategicRelevance } from "./FacilityStrategicRelevance";
import { FacilityMemberPriorities } from "./FacilityMemberPriorities";
import { FacilityEngagementContext } from "./FacilityEngagementContext";
import { FacilityEvidenceChanges } from "./FacilityEvidenceChanges";

export function FacilityStrategySections({
  scope,
  open,
  ids,
}: {
  scope: ProfileEvidenceScope;
  open: boolean;
  ids: {
    strategic: string;
    priorities: string;
    engagement: string;
    changes: string;
  };
}) {
  const strategic = useProfileDistrictStrategic(scope, open);
  const priority = useProfileDistrictPriority(scope, open);
  return (
    <>
      <FacilityStrategicRelevance
        id={ids.strategic}
        status={strategic}
        data={strategic.data}
      />
      <FacilityMemberPriorities
        id={ids.priorities}
        status={priority}
        data={priority.data}
      />
      <FacilityEngagementContext
        id={ids.engagement}
        scope={scope}
        status={strategic}
        data={strategic.data}
      />
      <FacilityEvidenceChanges
        id={ids.changes}
        status={priority}
        data={priority.data}
      />
    </>
  );
}
