import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { Facility } from "./contracts";
import { assertProfileActor, type ProfileActor } from "./profile-access";
import { profileReadKey } from "./profile-keys";
import {
  profileFacilityList,
  profileFacilityReceipt,
} from "./profile-receipts";
import { assertProfileSource, type ProfileSource } from "./profile-source";

export type FacilityAction =
  | { kind: "resolve-district" | "geocode"; facilityId: string }
  | {
      kind: "geocode-candidate";
      facilityId: string;
      candidateIndex: number;
      expectedRevision: string;
    };
export type FacilityActionContext = {
  clientId: string;
  actor: ProfileActor;
  source: ProfileSource;
  facility: Facility;
};
// This compares the displayed projection only. It is never sent as a native CAS.
export const facilityActionRevision = (facility: Facility) =>
  JSON.stringify([
    facility.addressLine,
    facility.city,
    facility.state,
    facility.zip,
    facility.congressionalDistrict,
    facility.stateHouseDistrict,
    facility.stateSenateDistrict,
    facility.districtSource,
    facility.congressionalDistrictCongress,
    facility.latitude,
    facility.longitude,
    facility.geocodeStatus,
    facility.geocodedAt,
    facility.geocodeMatchedAddress,
    facility.geocodeLastError,
    facility.geocodeNextAttemptAt,
    facility.geocodeAttemptCount,
    facility.geocodeCandidateRevision,
    facility.geocodeCandidates,
  ]);

export function assertFacilityAction(
  cache: QueryClient,
  context: FacilityActionContext,
  action: FacilityAction,
) {
  const { clientId, actor, source, facility } = context;
  assertProfileActor(cache, actor);
  assertProfileSource(cache, source);
  const parsed = profileFacilityList(clientId, actor.tenantId).safeParse(
    cache.getQueryData(source.key),
  );
  const current = parsed.success
    ? parsed.data.find((row) => row.id === action.facilityId)
    : undefined;
  if (
    JSON.stringify(source.key) !==
      JSON.stringify(profileReadKey(clientId, "facilities", actor)) ||
    facility.id !== action.facilityId ||
    facility.clientId !== clientId ||
    !current ||
    facilityActionRevision(current) !== facilityActionRevision(facility)
  )
    throw new ApiError(
      409,
      "The saved facility changed or is unavailable. Review its current address resolution.",
    );
  if (action.kind === "geocode-candidate") {
    const candidate = current.geocodeCandidates?.[action.candidateIndex];
    if (
      !Number.isSafeInteger(action.candidateIndex) ||
      action.candidateIndex < 0 ||
      !candidate?.matchedAddress?.trim() ||
      !current.geocodeCandidateRevision ||
      current.geocodeCandidateRevision !== action.expectedRevision
    )
      throw new ApiError(
        409,
        "The displayed address choice is unavailable or changed. Review the current candidates.",
      );
  } else if (
    !current.addressLine?.trim() ||
    !current.city?.trim() ||
    !current.state?.trim()
  ) {
    throw new ApiError(
      400,
      "Enter a street address, city and state before geocoding.",
    );
  }
}

export async function writeFacilityAction(
  api: ApiClient,
  cache: QueryClient,
  context: FacilityActionContext,
  action: FacilityAction,
  signal: AbortSignal,
) {
  assertFacilityAction(cache, context, action);
  signal.throwIfAborted();
  const path = `clients/${context.clientId}/facilities/${encodeURIComponent(action.facilityId)}`;
  return api.request(
    "core",
    `${path}/${action.kind === "geocode-candidate" ? "geocode-candidate/reviewed" : action.kind}`,
    profileFacilityReceipt(
      context.clientId,
      context.actor.tenantId,
      action.facilityId,
    ),
    {
      method: "POST",
      body:
        action.kind === "geocode-candidate"
          ? {
              candidateIndex: action.candidateIndex,
              expectedRevision: action.expectedRevision,
            }
          : undefined,
      signal,
    },
  );
}
