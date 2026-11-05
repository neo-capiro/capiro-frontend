import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { facility } from "./facility-map-fixtures";
import { facilitySchema } from "../src/features/portfolio/client-profile/contracts";
import {
  locationResolutionState,
  isConfirmedSite,
  safeEvidenceUrl,
  hasPhysicalFacilityAddress,
} from "../src/features/portfolio/client-profile/location-resolution";
import { LocationResolution } from "../src/features/portfolio/client-profile/LocationResolution";
import { facilityFormBody } from "../src/features/portfolio/client-profile/facility-map-model";

describe("location resolution and evidence", () => {
  it("accepts a physical street and ZIP without inferring a city or state", () => {
    expect(
      hasPhysicalFacilityAddress({
        ...facility,
        addressLine: "100 Test Street",
        city: null,
        state: null,
        zip: "00000",
      }),
    ).toBe(true);
    expect(
      hasPhysicalFacilityAddress({
        ...facility,
        addressLine: null,
        city: "Test city",
        state: "CA",
        zip: "00000",
      }),
    ).toBe(false);
    expect(
      hasPhysicalFacilityAddress({
        ...facility,
        addressLine: "100 Test Street",
        city: null,
        state: null,
        zip: null,
      }),
    ).toBe(false);
  });
  it.each([
    "resolved",
    "needs_address",
    "ambiguous",
    "source_unavailable",
    "not_applicable",
    "stale_boundary",
  ] as const)("retains server-owned %s state", (status) => {
    const record = facilitySchema.parse({
      ...facility,
      geographicResolution: { status, districts: [] },
    });
    expect(locationResolutionState(record)).toBe(status);
    expect(
      renderToStaticMarkup(
        createElement(LocationResolution, { facility: record }),
      ),
    ).not.toContain("NaN");
  });
  it("separates resolved geography from unconfirmed occupancy", () => {
    const record = facilitySchema.parse({
      ...facility,
      siteVerificationStatus: "proposed",
      geographicResolution: {
        status: "resolved",
        districts: [],
        requiresReview: true,
      },
    });
    expect(isConfirmedSite(record)).toBe(false);
    expect(locationResolutionState(record)).toBe("resolved");
    expect(
      renderToStaticMarkup(
        createElement(LocationResolution, { facility: record }),
      ),
    ).toContain("Unconfirmed site");
  });
  it("never assigns US districts to an international site", () => {
    expect(locationResolutionState({ ...facility, country: "GB" })).toBe(
      "not_applicable",
    );
  });
  it.each(["PR", "GU", "VI", "AS", "MP"])(
    "keeps %s territory geography eligible",
    (country) => {
      expect(locationResolutionState({ ...facility, country })).toBe(
        "resolved",
      );
    },
  );
  it("does not resend stale verified points and derived state districts after an address edit", () => {
    const saved = {
      ...facility,
      stateHouseDistrict: "10",
      stateSenateDistrict: "20",
      verifiedPoint: {
        latitude: 34,
        longitude: -118,
        verifiedAt: "2026-01-01T09:00:00.000Z",
      },
    };
    const body = facilityFormBody(
      {
        name: saved.name,
        addressLine: "2 Synthetic Street",
        stateHouseDistrict: "10",
        stateSenateDistrict: "20",
        pointLatitude: "34",
        pointLongitude: "-118",
        pointVerifiedAt: "2026-01-01",
      },
      saved,
    );
    expect(body).not.toHaveProperty("verifiedPoint");
    expect(body).not.toHaveProperty("stateHouseDistrict");
    expect(body).not.toHaveProperty("stateSenateDistrict");
  });
  it("retains prior verified history while lookup is unavailable", () => {
    const record = facilitySchema.parse({
      ...facility,
      geographicResolution: { status: "source_unavailable", districts: [] },
      geographicHistory: [
        {
          status: "resolved",
          version: { congress: 119, vintage: "Census2020_Census2020" },
          districts: [{ chamber: "house", code: "01" }],
          resolvedAt: "2026-01-01T00:00:00Z",
          source: "census",
        },
      ],
    });
    const html = renderToStaticMarkup(
      createElement(LocationResolution, { facility: record }),
    );
    expect(html).toContain("Previous district resolutions");
    expect(html).toContain("Congress 119");
  });
  it("requires site evidence before confirming occupancy", () => {
    expect(() =>
      facilityFormBody({
        name: "Synthetic site",
        siteVerificationStatus: "verified",
      }),
    ).toThrow("source URL");
    expect(
      facilityFormBody({
        name: "Synthetic site",
        siteVerificationStatus: "verified",
        siteSourceUrl: "https://example.test/site",
        siteEvidence: "Synthetic evidence passage",
        siteObservedAt: "2026-01-01",
      }),
    ).toMatchObject({
      sourceEvidence: [{ sourceUrl: "https://example.test/site" }],
      sourceObservedAt: "2026-01-01T00:00:00.000Z",
    });
  });
  it("preserves redacted source records on unrelated facility edits", () => {
    const saved = facilitySchema.parse({
      ...facility,
      siteVerificationStatus: "verified",
      sourceEvidence: [],
      sourceEvidenceUnavailable: true,
      economicImpact: {
        jobs: 12,
        observedAt: "2026-01-01T00:00:00Z",
        evidence: [],
        sourceUnavailable: true,
      },
    });
    const body = facilityFormBody(
      {
        name: "Renamed synthetic site",
        siteVerificationStatus: "verified",
        "impact:jobs": "12",
      },
      saved,
    );
    expect(body).not.toHaveProperty("sourceEvidence");
    expect(body).not.toHaveProperty("economicImpact");
    const html = renderToStaticMarkup(
      createElement(LocationResolution, { facility: saved }),
    );
    expect(html).toContain("original site evidence is no longer shared");
    expect(html).toContain("original impact evidence is no longer shared");
    expect(html).toContain("Saved company impact");
    expect(html).not.toContain("Site source evidence has not been supplied");
    expect(() =>
      facilityFormBody({ name: saved.name, "impact:jobs": "13" }, saved),
    ).toThrow("source URL");
    expect(() =>
      facilityFormBody(
        {
          name: saved.name,
          siteVerificationStatus: "verified",
          "impact:jobs": "12",
        },
        { ...saved, siteVerificationStatus: "unverified" },
      ),
    ).toThrow("source URL");
  });
  it("preserves capability links when their source list was unavailable", () => {
    expect(
      facilityFormBody({ name: "Synthetic site", capabilitiesLoaded: "false" }),
    ).not.toHaveProperty("capabilityIds");
    expect(
      facilityFormBody({ name: "Synthetic site", capabilitiesLoaded: "true" }),
    ).toHaveProperty("capabilityIds", []);
  });
  it("requires a valid verified point and date, never a city centroid fallback", () => {
    expect(() =>
      facilityFormBody({
        name: "Synthetic site",
        pointLatitude: "34",
        pointLongitude: "-118",
      }),
    ).toThrow("observation date");
    expect(
      facilityFormBody({
        name: "Synthetic site",
        pointLatitude: "34",
        pointLongitude: "-118",
        pointVerifiedAt: "2026-01-01",
      }),
    ).toHaveProperty("verifiedPoint", {
      latitude: 34,
      longitude: -118,
      verifiedAt: "2026-01-01T00:00:00.000Z",
    });
  });
  it("requires dated impact evidence when figures change", () => {
    expect(() =>
      facilityFormBody({ name: "Synthetic site", "impact:jobs": "12" }),
    ).toThrow("source URL");
    expect(
      facilityFormBody({
        name: "Synthetic site",
        "impact:jobs": "12",
        impactSourceUrl: "https://example.test/impact",
        impactEvidence: "Synthetic test evidence",
        impactObservedAt: "2026-01-01",
      }),
    ).toMatchObject({
      economicImpact: { jobs: 12, observedAt: "2026-01-01T00:00:00.000Z" },
    });
  });
  it("does not create links from executable source schemes", () => {
    expect(safeEvidenceUrl("javascript:alert(1)")).toBeUndefined();
  });
});
