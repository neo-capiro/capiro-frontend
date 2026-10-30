import { expect, test, type Page } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";
import {
  controlledRead,
  otherClientId,
} from "./acceptance-relationships-fixtures";
import {
  installProfileCurrentState,
  profileEvent,
} from "./profile-current-state-fixtures";
import { profileIdentity } from "../profile-current-state-fixtures";
import { boundaryFixture, facility } from "../facility-map-fixtures";
import type { Client } from "../../src/features/portfolio/index/public";
import type { FacilityNexus } from "../../src/features/portfolio/client-profile/facility-map-contracts";
import type { FacilityCommitteeSnapshot } from "../../src/features/portfolio/client-profile/facility-committee-contracts";
import type {
  ProfileEconomicFootprint,
  ProfileDistrictEconomicContext,
  ProfileDistrictStrategic,
  ProfileDistrictPriority,
} from "../../src/features/portfolio/client-profile/profile-evidence-contracts";

// Synthetic native GET payloads are typed by the production receiving subsets.
// No real backend, authentication or current-source coverage is asserted here.
const instant = "2026-10-16T12:00:00Z";
const member = {
  bioguideId: "A000001",
  fullName: "Synthetic Representative",
  party: null,
  state: "CA",
  district: 1,
  chamber: "house",
};
const savedClient: Client = {
  ...client,
  cageCode: "1ABC2",
  uei: "ABC123DEF456",
  naicsCodes: ["541330"],
  pscCodes: ["R425"],
  applicantTypes: ["Small businesses"],
  setAsideCertifications: ["HUBZONE"],
  submissionTracks: ["NDAA"],
  issueCodes: ["DEF"],
  intakeData: {
    samStatus: "Pending",
    samExpirationDate: "2027-06-14",
    ldaRegistrantName: "Synthetic registrant",
    ein: "123456789",
    sectors: ["DEFENSE"],
  },
};
const footprint = (): ProfileEconomicFootprint => ({
  clientId,
  districts: [],
  imports: [],
  evidence: [
    {
      id: "synthetic-location-evidence",
      importId: "synthetic-import",
      rowOrdinal: 2,
      evidenceType: "employee",
      subjectName: "Pending location employee evidence",
      subjectId: null,
      state: "CA",
      congressionalDistrict: "01",
      boundaryCongress: 119,
      numericValue: 25,
      unit: "people",
      currency: null,
      verificationStatus: "user_provided",
      reviewStatus: "pending_review",
      externalUseApproved: false,
      effectiveFrom: "2024-01-01",
      effectiveTo: "2024-12-31",
      observedAt: "2025-02-01T12:00:00Z",
      promotedFacilityId: facility.id,
      createdAt: instant,
      reviewedAt: null,
    },
  ],
  coverage: { percent: 20, measured: ["employee"], missing: ["payroll"] },
  totals: {
    approvedEvidenceCount: 0,
    pendingEvidenceCount: 1,
    facilityCount: 1,
    employeeCount: 999999,
    payroll: null,
    capitalInvestment: null,
    taxes: null,
    supplierCount: 0,
    supplierSpend: null,
    partnerCount: 0,
    beneficiaryCount: null,
    projectSiteCount: 0,
  },
  warnings: ["Synthetic client evidence is not period complete"],
  generatedAt: instant,
});
const economics = (): ProfileDistrictEconomicContext => ({
  districtKey: "CA-01",
  state: "CA",
  districtCode: "01",
  metrics: [2023, 2022].map((year) => ({
    source: "acs",
    dataset: "synthetic_acs_5yr",
    sourceYear: year,
    boundaryCongress: 118,
    metricKey: "unemployment_rate_percent",
    value: year === 2023 ? 0 : null,
    unit: "percent",
    marginOfError: year === 2023 ? 0.8 : null,
    naicsCode: null,
    sourceRecordId: `synthetic-acs-${year}`,
    sourceUrl: "https://example.test/synthetic-acs",
    observedAt: "2024-12-12T12:00:00Z",
    lastSyncedAt: "2025-01-02T12:00:00Z",
  })),
  sources: [
    {
      source: "acs",
      dataset: "synthetic_acs_5yr",
      sourceYear: 2023,
      boundaryCongress: 118,
      status: "success_with_errors",
      lastAttemptAt: "2025-01-02T11:55:00Z",
      lastCompletedAt: "2025-01-02T12:00:00Z",
      rowsSeen: 5,
      rowsWritten: 4,
      rowsRejected: 1,
      error: null,
      annual: true,
    },
  ],
  warnings: ["Synthetic public source coverage is partial"],
  generatedAt: instant,
});
const nexus = (): FacilityNexus => ({
  clientId,
  score: null,
  coveragePercent: 12,
  breakdown: [],
  generatedAt: instant,
  districts: [
    {
      districtKey: "CA-01",
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
      label: "Synthetic contracts source",
      lastSyncedAt: "2026-09-01T10:00:00Z",
      neverSynced: false,
    },
  ],
});
const strategic = (): ProfileDistrictStrategic => ({
  clientId,
  clientName: client.name,
  districtKey: "CA-01",
  state: "CA",
  district: "01",
  memberBioguides: [member.bioguideId],
  nexusStrength: null,
  strategicEnabled: true,
  strategic: {
    score: null,
    coveragePercent: 0,
    breakdown: [],
    evidence: [],
    missingComponents: ["committeeJurisdiction"],
    unavailableComponents: ["memberHistoricalPriorities"],
    strongestDrivers: [],
    freshness: [],
    conflicts: [],
    scoreVersion: "synthetic-score",
    weightsVersion: "synthetic-weights",
    minCoveragePercent: 20,
    computedAt: instant,
  },
});
const priority = (): ProfileDistrictPriority => ({
  clientId,
  clientName: client.name,
  districtKey: "CA-01",
  state: "CA",
  district: "01",
  member: {
    houseMemberBioguideIds: [member.bioguideId],
    senatorBioguideIds: [],
    representation: "Synthetic",
  },
  nexusStrength: null,
  strategicRelevance: null,
  dataCoverage: null,
  priorityIntelligence: {
    cpfCds: {
      availability: {
        status: "loaded",
        reason: null,
        lastIngestRunAt: instant,
        loadedFiscalYears: [2026],
      },
      districtRequests: [
        {
          requestId: "synthetic-public-request",
          chamber: "house",
          requestType: "cpf",
          fiscalYear: 2026,
          requesterName: member.fullName,
          recipientName: "Unrelated synthetic recipient",
          projectTitle: "Public district request without client attribution",
          districtKey: "CA-01",
          geography: { basis: "house_district", state: "CA", district: "01" },
          requestedAmountUsd: 60000,
          finalAmountUsd: null,
          amountStageRaw: "Requested",
          appropriationsAccountRaw: null,
          sourceOccurrenceCount: 1,
          clientAttribution: null,
        },
      ],
      clientRequests: [],
      memberHistoricalPriorities: [],
      warnings: [],
    },
    federalProperty: {
      availability: {
        status: "not_loaded",
        reason: "Synthetic absent property source",
        lastSuccessAt: null,
        lastFailureAt: null,
        lastError: null,
      },
      detailedAssetCount: null,
      detailedSquareFeetTotal: null,
      summarizedInstallationCount: null,
      ownedCount: null,
      leasedCount: null,
      agenciesByAssetCount: [],
      fiscalYears: [],
      boundaryCongresses: [],
      warnings: [],
    },
    sectorSignals: {
      availability: { status: "not_loaded", sources: [] },
      warnings: [],
    },
    recentChanges: [],
  },
  strongestPrioritySignals: [],
  missingPrioritySources: ["gsa"],
  freshness: [],
  geographyVintage: { boundaryCongress: 118, conflict: false, detail: null },
  warnings: [],
  computedAt: instant,
});
const committees = (): FacilityCommitteeSnapshot => ({
  kind: "member",
  id: "member-42",
  identity: { memberId: 42, bioguideId: member.bioguideId },
  source: {
    snapshotId: "synthetic-directory-snapshot",
    memberId: 42,
    lastUpdatedAt: instant,
  },
  committees: [null, "2026-01-01T00:00:00Z"].map((endedAt, index) => ({
    committeeId: `synthetic-committee-${index}`,
    committeeName: index
      ? "Former synthetic committee"
      : "Current synthetic committee",
    person: { personType: "member", id: "member-42", sourceId: 42 },
    membershipType: "member",
    position: "Ranking Member",
    party: null,
    rank: 2,
    status: "Source active",
    startedAt: "2025-01-03T12:00:00Z",
    endedAt,
    sourceUpdatedAt: instant,
  })),
});

async function installProfile(
  page: Page,
  scoped = false,
  location: typeof facility = facility,
) {
  const harness = scoped ? await installProfileCurrentState(page) : null;
  const unexpected = harness?.unexpected ?? (await installFixtures(page));
  const supportReads: Awaited<ReturnType<typeof controlledRead>>[] = [];
  if (harness) harness.state.facilities = [{ ...location }];
  else
    supportReads.push(
      await controlledRead(
        page,
        `**/api/backend/core/clients/${clientId}/facilities`,
        [location],
      ),
    );
  supportReads.push(
    await controlledRead(
      page,
      `**/api/backend/core/clients/${clientId}`,
      savedClient,
    ),
  );
  supportReads.push(
    await controlledRead(
      page,
      `**/api/backend/core/clients/${clientId}/targets`,
      [],
    ),
  );
  supportReads.push(
    await controlledRead(page, "**/intelligence/district-nexus/boundaries?*", {
      status: "current",
      vintage: "119",
      generatedAt: instant,
      districtCount: 2,
      source: "census_cartographic_500k",
      hash: "synthetic-boundary",
      warnings: [],
    }),
  );
  supportReads.push(
    await controlledRead(
      page,
      "**/intelligence/district-nexus/boundaries/C/geojson",
      boundaryFixture,
    ),
  );
  supportReads.push(
    await controlledRead(page, `**/clients/${clientId}/representation`, [
      {
        facility: {
          id: location.id,
          name: location.name,
          city: location.city,
          state: location.state,
        },
        representation: {
          unresolved: false,
          federal: { house: member, senate: [] },
          state: { lower: null, upper: null },
        },
      },
    ]),
  );
  const reads = {
    programs: await controlledRead(
      page,
      `**/intelligence/clients/${clientId}/pe-relevance?*`,
      { data: [], total: 0, page: 1, limit: 20 },
    ),
    nexus: await controlledRead(
      page,
      `**/intelligence/clients/${clientId}/district-nexus-v2`,
      nexus(),
    ),
    footprint: await controlledRead(
      page,
      `**/intelligence/clients/${clientId}/district-nexus-v2/economic-footprint`,
      footprint(),
    ),
    economic: await controlledRead(
      page,
      "**/intelligence/district-nexus/districts/CA/01/economic-context",
      economics(),
    ),
    strategic: await controlledRead(
      page,
      `**/intelligence/district-nexus/districts/CA/01/strategic?clientId=${clientId}`,
      strategic(),
    ),
    priority: await controlledRead(
      page,
      `**/intelligence/clients/${clientId}/district-nexus-v2/priority-intelligence?state=CA&district=01`,
      priority(),
    ),
    committee: await controlledRead(
      page,
      `**/directory/members/${member.bioguideId}`,
      committees(),
    ),
  };
  return { reads, supportReads, harness, unexpected };
}
function assertReadOnly(control: Awaited<ReturnType<typeof installProfile>>) {
  for (const read of [...Object.values(control.reads), ...control.supportReads])
    expect(read.writes).toEqual([]);
  expect(control.harness?.state.writes ?? []).toEqual([]);
  expect(control.unexpected).toEqual([]);
}
async function openLocation(page: Page) {
  await page
    .getByRole("button", {
      name: `Open facility ${facility.name}`,
      exact: true,
    })
    .click();
  const detail = page.getByRole("dialog", {
    name: `${facility.name} · CA-01`,
    exact: true,
  });
  await expect(detail).toBeVisible();
  return detail;
}
async function holdFirstFootprint(page: Page, value: ProfileEconomicFootprint) {
  let entered = 0,
    completed = 0,
    release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    `**/intelligence/clients/${clientId}/district-nexus-v2/economic-footprint`,
    async (route) => {
      expect(route.request().method()).toBe("GET");
      if (++entered > 1)
        return json(
          route,
          { message: "Synthetic replacement actor refusal" },
          403,
        );
      await pending;
      try {
        await json(route, value);
      } catch (error) {
        if (!route.request().failure()) throw error;
      } finally {
        completed++;
      }
    },
  );
  return {
    get entered() {
      return entered;
    },
    get completed() {
      return completed;
    },
    release,
  };
}

test.use({ viewport: { width: 1440, height: 1040 } });

test("one Government profile entry preserves thirteen saved fields and keeps FY context separate from actual client awards", async ({
  page,
}, info) => {
  const control = await installProfile(page);
  await page.goto(`/portfolio/${clientId}`);
  const entry = page.getByRole("button", {
    name: "Government & federal profile",
    exact: true,
  });
  await expect(entry).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Government info", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Federal footprint", exact: true }),
  ).toHaveCount(0);
  await entry.click();
  const dialog = page.getByRole("dialog", {
    name: "Government & federal profile",
    exact: true,
  });
  await expect(dialog.locator("dt")).toHaveText([
    "SAM.gov status",
    "SAM.gov expiration",
    "CAGE code",
    "UEI",
    "LDA registrant",
    "EIN",
    "NAICS",
    "PSC",
    "Organization types",
    "Federal set-aside certifications",
    "Sector",
    "Active tracks",
    "LDA issue codes",
  ]);
  for (const text of [
    "1ABC2",
    "ABC123DEF456",
    "Synthetic registrant",
    "123456789",
    "Pending",
    "NDAA Authorization Request",
  ])
    await expect(dialog.getByText(text, { exact: true })).toBeVisible();
  await page.screenshot({
    path: info.outputPath("government-identity-desktop.png"),
  });
  await dialog
    .getByRole("button", { name: "Federal activity", exact: true })
    .click();
  await expect(
    dialog
      .getByRole("region", { name: "Program funding context" })
      .locator("dd"),
  ).toHaveText(["Unavailable", "Unavailable", "Unavailable"]);
  const awards = dialog.getByRole("region", {
    name: "Client-attributable awards",
  });
  await expect(awards).toContainText("987,654,321");
  await expect(awards).toContainText("Unavailable");
  await expect(awards).toContainText("900,000");
  await expect(dialog).not.toContainText("60,000");
  await page.screenshot({
    path: info.outputPath("government-federal-desktop.png"),
  });
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(entry).toBeVisible();
  assertReadOnly(control);
});

test("a saved map location exposes ten areas, retains the existing editor and returns to its map", async ({
  page,
}, info) => {
  const control = await installProfile(page);
  await page.goto(`/portfolio/${clientId}`);
  const detail = await openLocation(page);
  await page.screenshot({
    path: info.outputPath("location-opening-desktop.png"),
  });
  for (const heading of [
    "Location",
    "Client economic footprint",
    "Unemployment",
    "Workforce and commuting",
    "Representation & committees",
    "Contracts & grants",
    "Strategic relevance",
    "Member priorities",
    "Strategy & engagement",
    "Changes & evidence",
  ])
    await expect(
      detail.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  const navigation = detail.getByRole("navigation", {
    name: "Location profile sections",
  });
  await expect(navigation.getByRole("button")).toHaveCount(6);
  await navigation
    .getByRole("button", { name: "Workforce", exact: true })
    .click();
  await expect(
    detail.getByRole("heading", { name: "Unemployment", exact: true }),
  ).toBeInViewport();
  await expect(detail.locator("header").first()).toBeInViewport();
  await expect(
    detail.getByRole("button", { name: "Done", exact: true }),
  ).toBeInViewport();
  const awards = detail.getByRole("region", { name: "Contracts and grants" });
  await expect(awards).toContainText("$0");
  await expect(awards).toContainText("$120");
  await expect(awards).not.toContainText("987,654,321");
  await detail
    .getByRole("button", { name: "Edit location", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit facility",
    exact: true,
  });
  await expect(editor.getByLabel("Facility name", { exact: true })).toHaveValue(
    facility.name,
  );
  await editor.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(detail).toBeVisible();
  await page.screenshot({
    path: info.outputPath("location-ten-area-desktop.png"),
  });
  await detail.getByRole("button", { name: "Done", exact: true }).click();
  const map = page.getByRole("region", { name: "District nexus", exact: true });
  await expect(
    map.getByRole("button", {
      name: `Open facility ${facility.name}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Open district map", exact: true }),
  ).toBeEnabled();
  assertReadOnly(control);
});

test("a location awaiting address verification follows the desktop location hierarchy", async ({
  page,
}, info) => {
  const control = await installProfile(page, false, {
    ...facility,
    addressLine: null,
    districtSource: "user",
    geocodeStatus: "not_requested",
  });
  await page.goto(`/portfolio/${clientId}`);
  const detail = await openLocation(page);
  const location = detail.getByRole("region", {
    name: "Location and geography",
    exact: true,
  });
  await expect(location.getByText("Observed physical presence")).toBeVisible();
  await expect(
    location.getByRole("heading", { name: "Locations and districts" }),
  ).toBeVisible();
  await expect(location.locator("dl").first().locator("dt")).toHaveText([
    "Facility",
    "Address",
    "House district",
    "State legislative districts",
  ]);
  await expect(location.getByRole("note")).toContainText(
    "Geography needs verification",
  );
  await expect(
    location.getByRole("heading", { name: "Representation and committees" }),
  ).toBeVisible();
  await expect(location).toContainText(member.fullName, {
    timeout: 15_000,
  });
  await expect(
    location.getByRole("link", { name: "Open relationships" }),
  ).toHaveAttribute(
    "href",
    `/portfolio/${clientId}/relationships?kind=government`,
  );
  const box = await location.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box!.x - 439)).toBeLessThanOrEqual(4);
  expect(Math.abs(box!.y - 223)).toBeLessThanOrEqual(4);
  expect(Math.abs(box!.width - 778)).toBeLessThanOrEqual(4);
  await page.screenshot({
    path: info.outputPath("location-verification-desktop.png"),
  });
  assertReadOnly(control);
});

for (const status of [403, 404])
  test(`a ${status} economic rail failure is not an empty result and leaves independent evidence readable`, async ({
    page,
  }) => {
    const control = await installProfile(page);
    control.reads.footprint.fail(status);
    await page.goto(`/portfolio/${clientId}`);
    const detail = await openLocation(page);
    const economic = detail.getByRole("region", {
      name: "Client economic footprint",
      exact: true,
    });
    await expect(economic.getByRole("alert")).toBeVisible();
    await expect(
      economic.getByRole("button", { name: "Retry", exact: true }),
    ).toBeEnabled();
    await expect(economic).not.toContainText("No returned economic evidence");
    await expect(
      detail.getByRole("region", { name: "Unemployment", exact: true }),
    ).toContainText("synthetic_acs_5yr");
    await expect(
      detail.getByRole("region", {
        name: "Elected representation",
        exact: true,
      }),
    ).toContainText(member.fullName);
    assertReadOnly(control);
  });

test("mixed vintages, real zero and null values retain client, district and review provenance", async ({
  page,
}) => {
  const control = await installProfile(page);
  const evidence = footprint();
  evidence.evidence.push(
    {
      ...evidence.evidence[0]!,
      id: "approved",
      subjectName: "Approved private location evidence",
      reviewStatus: "approved",
    },
    {
      ...evidence.evidence[0]!,
      id: "other-location",
      subjectName: "Other location evidence must stay hidden",
      promotedFacilityId: "other",
    },
    {
      ...evidence.evidence[0]!,
      id: "district-only",
      subjectName: "Unlinked district evidence must stay hidden",
      promotedFacilityId: null,
    },
  );
  control.reads.footprint.hold(evidence);
  await page.goto(`/portfolio/${clientId}`);
  const detail = await openLocation(page);
  await expect.poll(() => control.reads.footprint.waiting).toBe(1);
  control.reads.footprint.release();
  const clientEvidence = detail.getByRole("region", {
    name: "Client economic footprint",
    exact: true,
  });
  await expect(clientEvidence).toContainText("pending review");
  await expect(clientEvidence).toContainText(
    "Approved private location evidence",
  );
  await expect(clientEvidence).toContainText("Not approved");
  await expect(clientEvidence).toContainText("2024-01-01");
  await expect(clientEvidence).toContainText("2024-12-31");
  await expect(clientEvidence).toContainText("synthetic-import");
  await expect(clientEvidence).not.toContainText("999999");
  await expect(detail).not.toContainText(
    "Other location evidence must stay hidden",
  );
  await expect(detail).not.toContainText(
    "Unlinked district evidence must stay hidden",
  );
  const unemployment = detail.getByRole("region", {
    name: "Unemployment",
    exact: true,
  });
  await expect(unemployment).toContainText("2023");
  await expect(unemployment).toContainText("2022");
  await expect(
    unemployment.locator("strong").filter({ hasText: /^0$/ }),
  ).toHaveCount(1);
  await expect(unemployment).toContainText("Not available");
  await expect(unemployment).toContainText("0.8");
  await expect(unemployment).toContainText("success with errors");
  await expect(
    detail.getByRole("region", {
      name: "Workforce and commuting",
      exact: true,
    }),
  ).toContainText("No LODES source sync status was returned.");
  const requests = detail.getByRole("region", {
    name: "Member priorities",
    exact: true,
  });
  await expect(requests).toContainText(
    "No client-attributed requests returned.",
  );
  await expect(requests).toContainText(
    "Public district request without client attribution",
  );
  await expect(requests).toContainText("No client attribution returned.");
  assertReadOnly(control);
});

test("committee loading is on demand, identity-correlated and limited to current associations in its snapshot", async ({
  page,
}) => {
  const control = await installProfile(page);
  const wrong = committees();
  wrong.identity.bioguideId = "B000002";
  control.reads.committee.hold(wrong);
  await page.goto(`/portfolio/${clientId}`);
  const detail = await openLocation(page);
  const committee = detail.getByRole("region", {
    name: `Committee context for ${member.fullName}`,
    exact: true,
  });
  await expect(
    committee.getByRole("button", {
      name: `Load committee snapshot · ${member.fullName}`,
      exact: true,
    }),
  ).toBeVisible();
  expect(control.reads.committee.reads).toBe(0);
  await committee
    .getByRole("button", { name: `Load committee snapshot · ${member.fullName}`, exact: true })
    .click();
  await expect.poll(() => control.reads.committee.waiting).toBe(1);
  control.reads.committee.release();
  await expect(committee.getByRole("alert")).toBeVisible();
  await expect(committee).not.toContainText("Current synthetic committee");
  control.reads.committee.hold(committees());
  await committee
    .getByRole("button", {
      name: `Reload committee snapshot · ${member.fullName}`,
      exact: true,
    })
    .click();
  await expect.poll(() => control.reads.committee.waiting).toBe(1);
  control.reads.committee.release();
  await expect(committee).toContainText("Current synthetic committee");
  await expect(committee).not.toContainText("Former synthetic committee");
  await expect(committee).toContainText("Ranking Member");
  await expect(committee).toContainText("synthetic-directory-snapshot");
  await expect(committee).toContainText("member-42");
  await expect(committee).toContainText("not a live freshness guarantee");
  assertReadOnly(control);
});

test("a held old-client location response cannot surface after selecting another client", async ({
  page,
}) => {
  const control = await installProfile(page);
  const old = footprint();
  old.evidence[0]!.subjectName = "Old client economic completion";
  const held = await holdFirstFootprint(page, old);
  control.supportReads.push(
    await controlledRead(page, `**/clients/${otherClientId}`, {
      ...client,
      id: otherClientId,
      name: "Other synthetic client",
    }),
  );
  control.supportReads.push(
    await controlledRead(page, `**/clients/${otherClientId}/people`, []),
  );
  await page.goto(`/portfolio/${clientId}`);
  await openLocation(page);
  await expect.poll(() => held.entered).toBe(1);
  await page.evaluate((href) => {
    history.pushState({}, "", href);
    dispatchEvent(new PopStateEvent("popstate"));
  }, `/portfolio/${otherClientId}/relationships`);
  await expect(
    page.getByText("No contacts. Add the first contact for this client.", {
      exact: true,
    }),
  ).toBeVisible();
  held.release();
  await expect.poll(() => held.completed).toBe(1);
  await expect(
    page.getByText("Old client economic completion", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: `${facility.name} · CA-01`, exact: true }),
  ).toHaveCount(0);
  assertReadOnly(control);
});

test("an old actor's held location completion cannot become the replacement actor's evidence", async ({
  page,
}) => {
  const control = await installProfile(page, true);
  const old = footprint();
  old.evidence[0]!.subjectName = "Old actor economic completion";
  const held = await holdFirstFootprint(page, old);
  await page.goto("/profile-current-state.html?mode=facilities");
  const detail = await openLocation(page);
  await expect.poll(() => held.entered).toBe(1);
  await profileEvent(page, "identity", {
    ...profileIdentity,
    user: { ...profileIdentity.user, id: "replacement-profile-actor" },
  });
  await expect(detail).toHaveCount(0);
  held.release();
  await expect.poll(() => held.completed).toBe(1);
  await expect(
    page.getByText("Old actor economic completion", { exact: true }),
  ).toHaveCount(0);
  const replacement = await openLocation(page);
  await expect(
    replacement
      .getByRole("region", { name: "Client economic footprint", exact: true })
      .getByRole("alert"),
  ).toBeVisible();
  await expect(replacement).not.toContainText("Old actor economic completion");
  assertReadOnly(control);
});
