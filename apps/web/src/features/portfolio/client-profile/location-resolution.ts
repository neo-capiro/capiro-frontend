import type { Facility } from "./contracts";
export const usDistrictCountries = new Set([
  "US",
  "PR",
  "GU",
  "VI",
  "AS",
  "MP",
]);

export function locationResolutionState(facility: Facility) {
  if (facility.geographicResolution)
    return facility.geographicResolution.status;
  if (facility.country && !usDistrictCountries.has(facility.country))
    return "not_applicable";
  if (facility.geocodeStatus === "ambiguous") return "ambiguous";
  if (["error", "failed", "unavailable"].includes(facility.geocodeStatus ?? ""))
    return "source_unavailable";
  if (
    facility.geocodeStatus === "matched" &&
    facility.districtSource === "geocoded"
  )
    return "resolved";
  return "needs_address";
}
export const locationResolutionLabels = {
  resolved: "Resolved",
  needs_address: "Needs address",
  ambiguous: "Ambiguous",
  source_unavailable: "Source unavailable",
  not_applicable: "International",
  stale_boundary: "Boundary changed",
};
export function isConfirmedSite(facility: Facility) {
  return facility.siteVerificationStatus === "verified";
}
export function candidateHasCurrentBoundary(
  facility: Facility,
  candidate: NonNullable<Facility["geocodeCandidates"]>[number],
) {
  const requested = facility.geographicResolution?.version;
  const resolved = candidate.resolution?.version;
  return Boolean(
    !["stale_boundary", "source_unavailable", "not_applicable"].includes(
      facility.geographicResolution?.status ?? "source_unavailable",
    ) &&
    requested &&
    resolved &&
    candidate.resolution?.status === "resolved" &&
    candidate.congressionalDistrictCongress === resolved.congress &&
    (
      [
        "congress",
        "stateLegislativeYear",
        "benchmark",
        "vintage",
        "geometryVersion",
      ] as const
    ).every(
      (key) => requested[key] != null && requested[key] === resolved[key],
    ),
  );
}
export function safeEvidenceUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function hasPhysicalFacilityAddress(facility: Facility) {
  return Boolean(
    facility.addressLine?.trim() &&
    (facility.zip?.trim() || (facility.city?.trim() && facility.state?.trim())),
  );
}
