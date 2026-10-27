import { expect, test, type Page } from "@playwright/test";
const at = "2026-10-27T00:00:00Z";
const context = {
  id: "synthetic-document",
  family: "hearing",
  publisher: "Synthetic publisher",
  title: "Synthetic hearing",
  congress: null,
  committee: null,
  publishedAt: at,
  status: "observed",
  currentRevisionId: null,
  transcriptAvailability: "partial",
  coverage: "partial",
  sourceUrl: "javascript:alert(1)",
};
const contextList = {
  items: [context],
  nextCursor: null,
  denominator: {
    eligible: 2,
    observed: 1,
    qualified: 0,
    available: 0,
    partial: 1,
    unavailable: 0,
  },
};
type Input = {
  params?: Record<string, string>;
  query?: Record<string, unknown>;
};
async function intercept(
  page: Page,
  result: (key: string, input: Input) => unknown,
) {
  const calls: { key: string; input: Input; method: string }[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const url = new URL(route.request().url()),
      key = url.pathname.split("/").at(-1)!;
    const input = JSON.parse(url.searchParams.get("input") || "{}");
    calls.push({ key, input, method: route.request().method() });
    await route.fulfill({ json: result(key, input) });
  });
  return calls;
}
test("native Research preserves filter, selected document and segment through Back/refresh", async ({
  page,
}) => {
  const calls = await intercept(page, (key) =>
    key === "defenseResearch.context.detail"
      ? {
          ...context,
          coverageReason: "Transcript is partial",
          revisions: [
            {
              id: "synthetic-revision",
              version: "1",
              contentHash: null,
              publishedAt: at,
              observedAt: at,
              status: "observed",
              sourceUrl: "https://example.test/source",
            },
          ],
          sections: [],
        }
      : key === "defenseResearch.offices"
        ? { items: [], total: 0, page: 1, limit: 25 }
        : contextList,
  );
  await page.goto("/defense-research.html?clientId=synthetic-client");
  await page
    .getByRole("textbox", { name: "Context source family" })
    .fill("hearing");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await page.getByRole("button", { name: "Synthetic hearing" }).click();
  await expect(page).toHaveURL(/researchId=synthetic-document/);
  await expect(page.getByText("Transcript is partial")).toBeVisible();
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  await page.getByRole("tab", { name: "Offices & relationships" }).click();
  await expect(page).toHaveURL(/researchSegment=offices/);
  await page.goBack();
  await expect(page.getByText("Transcript is partial")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Transcript is partial")).toBeVisible();
  await expect(page).toHaveURL(/clientId=synthetic-client/);
  expect(calls.some((call) => call.input.query?.family === "hearing")).toBe(
    true,
  );
  expect(calls.every((call) => call.method === "GET")).toBe(true);
});
test("customer coverage shows unknown denominator and partial counts without internal queues or writes", async ({
  page,
}) => {
  const calls = await intercept(page, () => ({
    projectionVersion: "synthetic",
    filters: {},
    denominatorKnown: false,
    limitations: ["Expected corpus is not attested"],
    internalQueue: "PRIVATE-QUEUE",
    rows: [
      {
        perimeter: "Defense",
        component: null,
        account: null,
        family: "rdte",
        fiscalYear: 2027,
        edition: "FY2027",
        stage: "request",
        detail: null,
        asOf: at,
        denominator: {
          state: "unknown",
          value: null,
          unit: "physical_documents",
          reason: "Not attested",
          attestedAt: null,
        },
        discovered: 4,
        parsed: 3,
        qualified: 1,
        published: 0,
        outcome: "unknown",
        limitations: ["Partial source set"],
        internalQueue: "PRIVATE-QUEUE",
      },
    ],
  }));
  await page.goto("/defense-research.html?view=coverage");
  await expect(
    page.getByText(
      "Complete physical-source denominators are not established for this selection.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Unknown Not attested/ }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: /4 discovered/ })).toContainText(
    "0 published",
  );
  await expect(page.getByText("PRIVATE-QUEUE")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Coverage component" }).fill("Army");
  await page.getByRole("button", { name: "Apply coverage filters" }).click();
  await expect(page).toHaveURL(/coverage_component=Army/);
  await page.getByRole("button", { name: "Refresh coverage" }).click();
  await expect
    .poll(
      () =>
        calls.filter((call) => call.input.query?.component === "Army").length,
    )
    .toBeGreaterThanOrEqual(2);
  expect(
    calls.every(
      (call) =>
        call.key === "defenseResearch.coverage" && call.method === "GET",
    ),
  ).toBe(true);
});
test("dossier funding retains exact decimal strings and missing source values", async ({
  page,
}) => {
  const subject = {
    type: "program_element",
    id: "synthetic-pe",
    label: "Synthetic PE",
  };
  const cell = {
    basis: {
      requestEdition: "FY2027",
      fundingFiscalYear: 2028,
      stage: "request",
      metric: "funding",
      unit: "usd_millions",
      currency: "USD",
      priceBasis: null,
      knownAt: null,
      knowledgeTimeSupported: false,
    },
    value: "9007199254740993.000001",
    disposition: "observed",
    sourceObservationId: "synthetic-one",
    replacedByObservationId: null,
    evidence: [],
  };
  await intercept(page, (key) =>
    key === "defenseResearch.dossier"
      ? {
          subject,
          projectionVersion: "defense-dossier-v1",
          fields: [
            {
              field: "mission",
              availability: "unavailable",
              value: null,
              reason: "No qualified narrative",
              fiscalPeriod: null,
              metric: null,
              unit: null,
              evidence: [],
            },
          ],
          coverage: {
            state: "partial",
            expectedFields: 1,
            availableFields: 0,
            partialFields: 0,
            unavailableFields: 1,
          },
        }
      : {
          subject,
          projectionVersion: "defense-funding-matrix-v1",
          cells: [
            cell,
            {
              ...cell,
              sourceObservationId: "synthetic-two",
              value: null,
              disposition: "missing",
            },
          ],
          supported: {
            fiscalYears: [2028],
            editions: ["FY2027"],
            stages: ["request"],
            metrics: ["funding"],
            knownAt: false,
          },
          limitations: ["Historical reconstruction unavailable"],
        },
  );
  await page.goto("/defense-research.html?researchSegment=dossiers");
  await page
    .getByRole("textbox", { name: "Dossier subject ID" })
    .fill("synthetic-pe");
  await page.getByRole("button", { name: "Open dossier" }).click();
  await expect(
    page.getByRole("cell", { name: /9007199254740993.000001/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Not available · usd_millions" }),
  ).toBeVisible();
  await expect(page.getByText("No qualified narrative")).toBeVisible();
  await expect(page).toHaveURL(/researchId=synthetic-pe/);
});

test("office relationships and acquisition continuity use their typed source owners", async ({
  page,
}) => {
  const office = {
    id: "synthetic-office",
    name: "Synthetic program office",
    officeType: "pm",
    service: "Army",
    parentOfficeName: null,
    status: "active",
    validFrom: null,
    validTo: null,
    sourceUrl: null,
    reviewStatus: "accepted",
    confidence: 1,
    observedAt: at,
    effectiveStart: null,
    effectiveEnd: null,
    availability: "partial",
    evidence: [],
  };
  const acquisition = {
    identityKey: "synthetic-acquisition",
    sourceSystem: "sam",
    sourceRecordId: "example-notice",
    recordKind: "notice",
    title: "Synthetic acquisition",
    status: "active",
    buyerOffice: "Synthetic program office",
    postedAt: at,
    responseDeadline: null,
    validFrom: null,
    validTo: null,
    contentHash: "hash",
    sourceUrl: null,
    sourceVersion: null,
    sourceObservedAt: at,
    recordedAt: at,
    textAvailability: "partial",
    amendmentCount: 2,
    openCoverageGaps: 1,
  };
  const calls = await intercept(
    page,
    (key) =>
      (
        ({
          "defenseResearch.offices": {
            items: [office],
            total: 1,
            page: 1,
            limit: 25,
          },
          "defenseResearch.office": {
            ...office,
            mission: "Synthetic office mission",
            responsibilities: null,
            scope: null,
          },
          "defenseResearch.relationships": {
            items: [
              {
                id: "synthetic-edge",
                from: { type: "office", id: office.id, label: office.name },
                to: {
                  type: "program",
                  id: "synthetic-program",
                  label: "Synthetic program",
                },
                relation: "manages",
                sourceStated: true,
                derived: false,
                inferred: false,
                validity: "valid",
                observationRevision: null,
                evidence: [],
                reviewStatus: "accepted",
                supersessionImpact: null,
              },
            ],
            total: 1,
            page: 1,
            limit: 100,
          },
          "defenseResearch.acquisitions": {
            items: [acquisition],
            total: 1,
            page: 1,
            limit: 25,
          },
          "defenseResearch.acquisition": {
            ...acquisition,
            revisions: [],
            childIdentities: [],
            amendmentIdentities: [],
            associations: [],
          },
        }) as Record<string, unknown>
      )[key],
  );
  await page.goto("/defense-research.html?researchSegment=offices");
  await page.getByRole("button", { name: office.name, exact: true }).click();
  await expect(page.getByText("Synthetic office mission")).toBeVisible();
  await expect(page.getByRole("cell", { name: "manages" })).toBeVisible();
  expect(
    calls.some(
      (call) =>
        call.key === "defenseResearch.relationships" &&
        call.input.query?.from === office.id,
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Acquisitions", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "2 amendments · 1 open coverage gaps" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: acquisition.title, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: acquisition.title }),
  ).toBeVisible();
  await expect(page.getByText(/Deadline: Not available/)).toBeVisible();
  expect(calls.every((call) => call.method === "GET")).toBe(true);
});
