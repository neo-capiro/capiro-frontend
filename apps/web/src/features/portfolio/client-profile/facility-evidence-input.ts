import type { Facility } from "./contracts";
import { safeEvidenceUrl } from "./location-resolution";

const impactFields = [
  "jobs",
  "payroll",
  "investment",
  "facilitySize",
  "suppliersInState",
] as const;
export function isFacilityEvidenceField(key: string) {
  return (
    key.startsWith("capability:") ||
    key.startsWith("impact:") ||
    [
      "siteSourceUrl",
      "siteEvidence",
      "siteObservedAt",
      "pointLatitude",
      "pointLongitude",
      "pointVerifiedAt",
      "pointReverified",
      "capabilitiesLoaded",
      "impactUnit",
      "impactSourceUrl",
      "impactEvidence",
      "impactObservedAt",
    ].includes(key)
  );
}
const value = (raw: Record<string, FormDataEntryValue>, key: string) =>
  String(raw[key] ?? "").trim();
function evidenceDate(raw: Record<string, FormDataEntryValue>, key: string) {
  const date = value(raw, key);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    Date.parse(date) > Date.now()
  )
    throw new Error(
      "Supply a valid observation date that is not in the future.",
    );
  return `${date}T00:00:00.000Z`;
}
export function facilityEvidenceBody(
  raw: Record<string, FormDataEntryValue>,
  facility?: Facility,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (value(raw, "capabilitiesLoaded") === "true")
    body.capabilityIds = Object.keys(raw)
      .filter((key) => key.startsWith("capability:"))
      .map((key) => key.slice(11));
  if (value(raw, "siteSourceUrl")) {
    if (
      !safeEvidenceUrl(value(raw, "siteSourceUrl")) ||
      !value(raw, "siteEvidence")
    )
      throw new Error(
        "Supply a public site source URL and its supporting passage.",
      );
    body.sourceObservedAt = evidenceDate(raw, "siteObservedAt");
    body.sourceEvidence = [
      ...(facility?.sourceEvidence ?? []),
      {
        sourceType: "person",
        sourceUrl: value(raw, "siteSourceUrl"),
        evidence: value(raw, "siteEvidence"),
      },
    ];
  }
  if (
    value(raw, "siteVerificationStatus") === "verified" &&
    !facility?.sourceEvidence?.length &&
    !(
      facility?.sourceEvidenceUnavailable &&
      facility.siteVerificationStatus === "verified"
    ) &&
    !body.sourceEvidence
  )
    throw new Error(
      "Confirm the site using a source URL and dated supporting evidence.",
    );
  if (
    ["pointLatitude", "pointLongitude", "pointVerifiedAt"].some((key) =>
      value(raw, key),
    )
  ) {
    const latitude = Number(value(raw, "pointLatitude")),
      longitude = Number(value(raw, "pointLongitude"));
    if (
      !value(raw, "pointLatitude") ||
      !value(raw, "pointLongitude") ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    )
      throw new Error(
        "Supply valid latitude and longitude for the verified point.",
      );
    const verifiedAt = evidenceDate(raw, "pointVerifiedAt");
    const pointChanged =
      !facility?.verifiedPoint ||
      latitude !== facility.verifiedPoint.latitude ||
      longitude !== facility.verifiedPoint.longitude ||
      verifiedAt.slice(0, 10) !==
        facility.verifiedPoint.verifiedAt.slice(0, 10);
    if (pointChanged || value(raw, "pointReverified") === "on")
      body.verifiedPoint = {
        latitude,
        longitude,
        verifiedAt:
          facility?.verifiedPoint?.verifiedAt.slice(0, 10) ===
          verifiedAt.slice(0, 10)
            ? facility.verifiedPoint.verifiedAt
            : verifiedAt,
      };
  }
  const impactChanged =
    impactFields.some(
      (field) =>
        value(raw, `impact:${field}`) !==
        String(facility?.economicImpact?.[field] ?? ""),
    ) ||
    value(raw, "impactUnit") !==
      (facility?.economicImpact?.facilitySizeUnit ?? "");
  if (impactChanged || value(raw, "impactSourceUrl")) {
    if (
      !safeEvidenceUrl(value(raw, "impactSourceUrl")) ||
      !value(raw, "impactEvidence")
    )
      throw new Error(
        "Changed impact figures require a public source URL, evidence passage and observation date.",
      );
    const metrics: Record<string, number> = {};
    for (const field of impactFields) {
      const input = value(raw, `impact:${field}`);
      if (!input) continue;
      const parsed = Number(input);
      if (!Number.isFinite(parsed) || parsed < 0)
        throw new Error("Impact figures must be nonnegative numbers.");
      metrics[field] = parsed;
    }
    body.economicImpact = {
      ...metrics,
      facilitySizeUnit: value(raw, "impactUnit") || undefined,
      observedAt: evidenceDate(raw, "impactObservedAt"),
      evidence: [
        {
          sourceType: "person",
          sourceUrl: value(raw, "impactSourceUrl"),
          evidence: value(raw, "impactEvidence"),
        },
      ],
    };
  }
  return body;
}
