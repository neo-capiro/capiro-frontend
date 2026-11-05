import { normalizeProfileDistrict } from "./profile-evidence-contracts";
import type { Facility } from "./contracts";
import {
  facilityEvidenceBody,
  isFacilityEvidenceField,
} from "./facility-evidence-input";

export function facilityCoordinates(
  facility: Facility,
): [number, number] | null {
  if (facility.latitude == null || facility.longitude == null) return null;
  if (typeof facility.latitude === "string" && !facility.latitude.trim())
    return null;
  if (typeof facility.longitude === "string" && !facility.longitude.trim())
    return null;
  const latitude = Number(facility.latitude),
    longitude = Number(facility.longitude);
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
    ? [longitude, latitude]
    : null;
}
export function facilityDistrict(facility: Facility): string | null {
  if (
    facility.geographicResolution &&
    facility.geographicResolution.status !== "resolved"
  )
    return null;
  const district = normalizeProfileDistrict({
    state: facility.state,
    districtCode: facility.congressionalDistrict,
  });
  return district ? `${district.state}-${district.districtCode}` : null;
}
export function facilityAddress(facility: Facility): string {
  return (
    [facility.addressLine, facility.city, facility.state, facility.zip]
      .filter(Boolean)
      .join(", ") || "Address not specified"
  );
}
export function facilityFormBody(
  raw: Record<string, FormDataEntryValue>,
  facility?: Facility,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isFacilityEvidenceField(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = ["state", "country"].includes(key)
      ? value.trim().toUpperCase()
      : value.trim();
    if (
      key === "employeeCount" &&
      trimmed &&
      (!Number.isSafeInteger(Number(trimmed)) || Number(trimmed) < 0)
    )
      throw new Error("Employees must be a whole number of zero or more.");
    const result =
      key === "employeeCount" && trimmed ? Number(trimmed) : trimmed || null;
    if (result !== null || facility) body[key] = result;
  }
  if (!String(raw.name ?? "").trim())
    throw new Error("Facility name is required.");
  if (
    String(raw.congressionalDistrict ?? "").trim() &&
    !String(raw.state ?? "").trim()
  )
    throw new Error("Pick a state before setting a district.");
  const addressChanged =
    facility &&
    ["addressLine", "city", "state", "zip", "country"].some(
      (field) =>
        field in body &&
        body[field] !== (facility[field as keyof Facility] ?? null),
    );
  if (addressChanged)
    for (const field of [
      "congressionalDistrict",
      "stateHouseDistrict",
      "stateSenateDistrict",
    ] as const) {
      if (field in body && body[field] === (facility[field] ?? null))
        delete body[field];
    }
  return { ...body, ...facilityEvidenceBody(raw, facility) };
}
