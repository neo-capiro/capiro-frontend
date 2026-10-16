import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FederalActivity } from "../src/features/portfolio/client-profile/FederalActivity";
import { FacilityAwardSection } from "../src/features/portfolio/client-profile/FacilityAwardSection";
import { NexusSourceFreshness } from "../src/features/portfolio/client-profile/NexusSourceFreshness";
import type { FacilityNexus } from "../src/features/portfolio/client-profile/facility-map-contracts";

const state = vi.hoisted(() => ({
  enabled: true,
  isPending: false,
  error: null as Error | null,
  data: undefined as FacilityNexus | undefined,
}));
vi.mock(
  "../src/features/portfolio/client-profile/facility-map-queries",
  () => ({
    useFacilityNexus: () => ({ ...state, refetch: vi.fn() }),
  }),
);
// These five existing cases isolate the independent Nexus award/freshness rail.
// Program context has its own native-page, actor/abort and presentation cases.
vi.mock(
  "../src/features/portfolio/client-profile/ClientProgramContext",
  () => ({
    ClientProgramContext: () => null,
  }),
);
const fixture = (): FacilityNexus => ({
  clientId: "client-a",
  score: null,
  coveragePercent: 0,
  breakdown: [],
  generatedAt: "2026-10-16T11:00:00Z",
  districts: [
    {
      districtKey: "VA-08",
      score: null,
      awarded: {
        contractObligations: 0,
        grantObligations: null,
        grantOutlays: 120,
      },
    },
  ],
  awarded: {
    contractObligations: 987654321,
    grantObligations: null,
    grantOutlays: 900000,
  },
  warnings: [],
  freshness: [
    {
      source: "contracts",
      label: "Contract source",
      lastSyncedAt: "2026-09-01T10:00:00Z",
      neverSynced: false,
    },
  ],
});
const renderAwards = (district = "08") =>
  renderToStaticMarkup(
    createElement(FacilityAwardSection, {
      scope: {
        clientId: "client-a",
        facilityId: "facility-a",
        district: { state: "VA", districtCode: district },
      },
      open: true,
      id: "awards",
    }),
  );
beforeEach(() =>
  Object.assign(state, {
    enabled: true,
    isPending: false,
    error: null,
    data: fixture(),
  }),
);

describe("Federal evidence attribution and availability", () => {
  it("keeps all program totals unavailable while preserving independent client awards", () => {
    const html = renderToStaticMarkup(
      createElement(FederalActivity, { clientId: "client-a", enabled: true }),
    );
    for (const label of ["FY obligated", "FY request", "Associated programs"])
      expect(html).toContain(`<dt>${label}</dt><dd>Unavailable</dd>`);
    expect(html).toContain("987,654,321");
    expect(html).toContain("Grant obligations</dt><dd>Unavailable");
    expect(html).not.toContain("113.9");
  });
  it("shows returned district client awards, preserving zero and never substituting the full client total", () => {
    const html = renderAwards();
    expect(html).toContain("$0");
    expect(html).toContain("$120");
    expect(html).not.toContain("987,654,321");
    expect(html).toContain("does not prove this location received the award");
  });
  it("does not fall back to client or public awards for an absent district", () => {
    const html = renderAwards("07");
    expect(html).toContain("No client nexus row returned for VA-07");
    expect(html.match(/<dd>Unavailable<\/dd>/g)).toHaveLength(3);
    expect(html).not.toContain("987,654,321");
  });
  it("separates source refresh, response computation, unknown freshness and never-synced", () => {
    const value = fixture();
    value.freshness.push(
      {
        source: "census",
        label: "Census source",
        lastSyncedAt: null,
        neverSynced: false,
        freshnessUnavailable: true,
      },
      {
        source: "assistance",
        label: "Assistance source",
        lastSyncedAt: null,
        neverSynced: true,
      },
    );
    const html = renderToStaticMarkup(
      createElement(NexusSourceFreshness, { value }),
    );
    expect(html).toContain("Last synced");
    expect(html).toContain("Response computed");
    expect(html).toContain("Census source: Freshness unavailable");
    expect(html).toContain("Assistance source: Not yet synced");
  });
  it("suppresses cached amounts after a session disable or read failure", () => {
    state.enabled = false;
    expect(renderAwards()).not.toContain("$120");
    state.enabled = true;
    state.error = new Error("Synthetic optional rail failure");
    const html = renderAwards();
    expect(html).toContain("Synthetic optional rail failure");
    expect(html).not.toContain("$120");
  });
});
